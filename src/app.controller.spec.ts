import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

describe('AppController', () => {
  let appController: AppController;
  let mockAppService: jest.Mocked<AppService>;

  beforeEach(async () => {
    mockAppService = {
      getDashboardSummary: jest.fn(),
    } as unknown as jest.Mocked<AppService>;

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('dashboardSummary', () => {
    it('should return dashboard summary', async () => {
      const mockResult = {
        tenant: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Tenant',
          slug: 'test-tenant',
          customDomain: null,
          planTier: 'free',
          subscriptionStatus: 'active',
        },
        memberCount: 1,
        members: [],
      };
      mockAppService.getDashboardSummary.mockResolvedValue(mockResult);

      expect(await appController.getDashboardSummary()).toBe(mockResult);
    });
  });
});
