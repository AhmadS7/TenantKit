import {
  Injectable,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from '../tenancy/tenant.entity';
import { getTenantManager } from '../tenancy/tenant-context';
import Stripe from 'stripe';

/**
 * Minimal shape of the Stripe objects carried on the webhook events we handle.
 * The SDK's `event.data.object` is a broad discriminated union; we read only a
 * handful of fields, so we narrow through this local view at the point of use.
 */
interface StripeWebhookObject {
  id?: string;
  status?: string;
  customer?: string | null;
  subscription?: string | null;
  metadata?: { tenantId?: string; plan?: string } | null;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe.Stripe | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    const apiKey = process.env.STRIPE_API_KEY;
    if (apiKey && apiKey !== 'change_me') {
      this.stripe = new Stripe(apiKey, {
        // Pin the API version. Cast via the constructor's config parameter
        // because this pinned literal is not part of the SDK's ApiVersion union.
        apiVersion: '2025-02-18',
      } as unknown as ConstructorParameters<typeof Stripe>[1]);
      this.logger.log('Stripe client initialized successfully.');
    } else {
      this.logger.warn(
        'Stripe API Key is not set or using placeholder. Running in Mock Sandbox Mode.',
      );
    }
  }

  /**
   * Tenant repository bound to the active request. When a tenant context is
   * present (e.g. authenticated checkout) this resolves to the RLS-scoped
   * transaction manager; on context-less paths (Stripe webhooks) it falls back
   * to the privileged pool so we can look tenants up by Stripe customer id
   * across the whole table.
   */
  private get tenantRepo(): Repository<Tenant> {
    return getTenantManager(this.dataSource.manager).getRepository(Tenant);
  }

  async createCheckoutSession(
    tenantId: string,
    plan: string,
    host: string,
  ): Promise<{ url: string }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const cleanPlan = plan.toLowerCase();
    if (!['pro', 'enterprise'].includes(cleanPlan)) {
      throw new BadRequestException('Invalid plan selection');
    }

    // Dynamic redirect URLs based on host
    const port = host.includes('localhost') ? ':3001' : '';
    const successUrl = `http://${host}${port}/dashboard?checkout_success=true`;
    const cancelUrl = `http://${host}${port}/billing?checkout_cancel=true`;

    // 1. Mock Sandbox Mode
    if (!this.stripe) {
      this.logger.log(
        `[Mock Stripe] Creating checkout session for Tenant: ${tenant.slug}, Plan: ${cleanPlan}`,
      );

      // Update tenant status to active subscription after a small delay simulation or directly for local tests
      tenant.planTier = cleanPlan;
      tenant.subscriptionStatus = 'active';
      tenant.stripeSubscriptionId = `sub_mock_${Math.random().toString(36).substring(7)}`;
      tenant.stripeCustomerId = `cus_mock_${Math.random().toString(36).substring(7)}`;
      await this.tenantRepo.save(tenant);

      return { url: successUrl };
    }

    // 2. Production Mode (Stripe API calls)
    try {
      let stripeCustomerId = tenant.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await this.stripe.customers.create({
          email: `${tenant.slug}@tenantkit-tenant.app`,
          name: tenant.name,
          metadata: { tenantId: tenant.id },
        });
        stripeCustomerId = customer.id;
        tenant.stripeCustomerId = stripeCustomerId;
        await this.tenantRepo.save(tenant);
      }

      // Map plans to test price IDs from environment
      const priceId =
        cleanPlan === 'pro'
          ? process.env.STRIPE_PRO_PRICE_ID || 'price_mock_pro'
          : process.env.STRIPE_ENT_PRICE_ID || 'price_mock_enterprise';

      const session = await this.stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          tenantId: tenant.id,
          plan: cleanPlan,
        },
      });

      return { url: session.url || successUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Stripe Checkout Error:', err);
      throw new BadRequestException(`Stripe error: ${message}`);
    }
  }

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!this.stripe || !webhookSecret) {
      this.logger.warn(
        'Stripe or Stripe Webhook Secret is not configured. Webhook ignored.',
      );
      return;
    }

    let event: ReturnType<Stripe.Stripe['webhooks']['constructEvent']>;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook signature verification failed: ${message}`);
      throw new ForbiddenException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    this.logger.log(`Received Stripe Webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as unknown as StripeWebhookObject;
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan || 'pro';

        if (tenantId) {
          await this.updateTenantSubscription(tenantId, {
            stripeSubscriptionId: session.subscription,
            planTier: plan,
            subscriptionStatus: 'active',
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data
          .object as unknown as StripeWebhookObject;
        // Lookup tenant by Stripe customer ID
        const tenant = await this.tenantRepo.findOne({
          where: { stripeCustomerId: subscription.customer as string },
        });

        if (tenant) {
          await this.updateTenantSubscription(tenant.id, {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data
          .object as unknown as StripeWebhookObject;
        const tenant = await this.tenantRepo.findOne({
          where: { stripeCustomerId: subscription.customer as string },
        });

        if (tenant) {
          await this.updateTenantSubscription(tenant.id, {
            stripeSubscriptionId: null,
            subscriptionStatus: 'canceled',
            planTier: 'free',
          });
        }
        break;
      }
      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async updateTenantSubscription(
    tenantId: string,
    update: Partial<Tenant>,
  ): Promise<void> {
    this.logger.log(
      `Updating subscription for Tenant ${tenantId}: ${JSON.stringify(update)}`,
    );
    await this.tenantRepo.update(tenantId, update);
  }

  async checkStripeHealth(): Promise<boolean> {
    if (!this.stripe) {
      // Mock Sandbox mode is active and considered healthy for mock environment
      return true;
    }
    try {
      // Perform a minimal check, e.g., retrieve the customer list with limit 1
      await this.stripe.customers.list({ limit: 1 });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Stripe API health check failed: ${message}`);
      return false;
    }
  }
}
