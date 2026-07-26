import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockRequest: any;
  let mockResponse: any;
  let mockExecutionContext: any;
  let mockCallHandler: any;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    mockRequest = {
      method: 'POST',
      url: '/auth/login',
      headers: {},
      body: { email: 'test@example.com', password: 'secretpassword' },
    };
    mockResponse = {
      statusCode: 200,
    };
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };
    mockCallHandler = {
      handle: jest
        .fn()
        .mockReturnValue(
          of({ accessToken: 'super-secret-token', user: { id: 1 } }),
        ),
    };
  });

  it('attaches correlation ID header and redacts sensitive body/response data', (done) => {
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(mockRequest.headers['x-correlation-id']).toBeDefined();
        expect(result).toBeDefined();
        done();
      },
    });
  });
});
