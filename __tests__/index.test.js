const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const cron = require('node-cron');
const { 
  performRequest, 
  checkDomainAvailability, 
  registerDomain, 
  performMultipleChecks, 
  registerSingleDomain, 
  registerMultipleDomains, 
  scheduleRegistration, 
  hexonetApi 
} = require('../index');
const winston = require('winston');

// Set up mock adapter
const mock = new MockAdapter(hexonetApi);

// Mock the cron.schedule function
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

// Mock logger
jest.mock('winston', () => {
  const originalWinston = jest.requireActual('winston');
  return {
    ...originalWinston,
    createLogger: jest.fn(() => ({
      error: jest.fn(),
      info: jest.fn(),
    })),
  };
});

describe('Domain Registration Bot', () => {
  afterEach(() => {
    mock.reset();
    jest.clearAllTimers();
  });

  // Tests for performRequest
  test('performRequest retries on failure', async () => {
    mock.onGet('/domains/check').replyOnce(500).onGet('/domains/check').reply(200, { status: 'available' });

    const requestConfig = {
      method: 'get',
      url: '/domains/check',
      params: { domain: 'example.com', apikey: 'dummy', user: 'dummy' },
    };

    const data = await performRequest(requestConfig);
    expect(data).toEqual({ status: 'available' });
  }, 30000); // Increase timeout to 30 seconds

  test('performRequest throws error after max retries', async () => {
    mock.onGet('/domains/check').reply(500);

    const requestConfig = {
      method: 'get',
      url: '/domains/check',
      params: { domain: 'example.com', apikey: 'dummy', user: 'dummy' },
    };

    await expect(performRequest(requestConfig)).rejects.toThrow('Failed after 5 retries');
  }, 30000); // Increase timeout to 30 seconds

  test('performRequest waits for retry delay', async () => {
    mock.onGet('/domains/check').replyOnce(500).onGet('/domains/check').reply(200, { status: 'available' });

    const requestConfig = {
      method: 'get',
      url: '/domains/check',
      params: { domain: 'example.com', apikey: 'dummy', user: 'dummy' },
    };

    const start = Date.now();
    await performRequest(requestConfig);
    const end = Date.now();

    // Ensure the total time includes the retry delay times number of retries (adjust as necessary)
    expect(end - start).toBeGreaterThanOrEqual(200); // Assuming retryDelay is 200 ms and only 1 retry
  }, 30000); // Increase timeout to 30 seconds

  // Tests for checkDomainAvailability
  test('checkDomainAvailability returns availability status', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'available' });

    const availability = await checkDomainAvailability('example.com');
    expect(availability.status).toBe('available');
  }, 30000); // Increase timeout to 30 seconds

  test('checkDomainAvailability handles unavailable domain', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'unavailable' });

    const availability = await checkDomainAvailability('example.com');
    expect(availability.status).toBe('unavailable');
  }, 30000); // Increase timeout to 30 seconds

  test('checkDomainAvailability handles invalid domain', async () => {
    mock.onGet('/domains/check').reply(400);

    await expect(checkDomainAvailability('invalid_domain')).rejects.toThrow();
  }, 30000); // Increase timeout to 30 seconds

  // Tests for registerDomain
  test('registerDomain registers the domain', async () => {
    mock.onPost('/domains/register').reply(200, { result: 'success' });

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    const result = await registerDomain('example.com', registrationDetails);
    expect(result.result).toBe('success');
  }, 30000); // Increase timeout to 30 seconds

  test('registerDomain handles registration failure', async () => {
    mock.onPost('/domains/register').reply(500);

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await expect(registerDomain('example.com', registrationDetails)).rejects.toThrow();
  }, 30000); // Increase timeout to 30 seconds

  // Tests for performMultipleChecks
  test('performMultipleChecks checks multiple domains concurrently', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'available' });

    const domains = ['example1.com', 'example2.com'];
    const results = await performMultipleChecks(domains);
    expect(results.length).toBe(2);
    expect(results[0].status).toBe('available');
    expect(results[1].status).toBe('available');
  }, 30000); // Increase timeout to 30 seconds

  test('performMultipleChecks handles empty domain list', async () => {
    const results = await performMultipleChecks([]);
    expect(results).toEqual([]);
  }, 30000); // Increase timeout to 30 seconds

  // Tests for registerSingleDomain
  test('registerSingleDomain registers available domain', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'available' });
    mock.onPost('/domains/register').reply(200, { result: 'success' });

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await registerSingleDomain('example.com', registrationDetails);
    // Check logs or other side-effects as needed
  }, 30000); // Increase timeout to 30 seconds

  test('registerSingleDomain handles unavailable domain', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'unavailable' });

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await registerSingleDomain('example.com', registrationDetails);
    // Check logs or other side-effects as needed
  }, 30000); // Increase timeout to 30 seconds

  // Tests for registerMultipleDomains
  test('registerMultipleDomains registers multiple available domains', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'available' });
    mock.onPost('/domains/register').reply(200, { result: 'success' });

    const domains = ['example1.com', 'example2.com'];
    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await registerMultipleDomains(domains, registrationDetails);
    // Check logs or other side-effects as needed
  }, 30000); // Increase timeout to 30 seconds

  test('registerMultipleDomains handles mixed availability', async () => {
    mock.onGet('/domains/check').replyOnce(200, { status: 'available' }).onGet('/domains/check').replyOnce(200, { status: 'unavailable' });
    mock.onPost('/domains/register').reply(200, { result: 'success' });

    const domains = ['example1.com', 'example2.com'];
    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await registerMultipleDomains(domains, registrationDetails);
    // Check logs or other side-effects as needed
  }, 30000); // Increase timeout to 30 seconds

  // Tests for scheduleRegistration
  test('scheduleRegistration schedules domain registration', () => {
    const cronTime = '* * * * *';
    const domain = 'example.com';
    const registrationDetails = { apikey: 'dummy', user: 'dummy' };

    scheduleRegistration(cronTime, domain, registrationDetails);
    expect(cron.schedule).toHaveBeenCalledWith(cronTime, expect.any(Function));
  });

  // Test error logging for registerSingleDomain
  test('registerSingleDomain logs error on failure', async () => {
    const logger = winston.createLogger();
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onGet('/domains/check').reply(500); // Simulate API error

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await registerSingleDomain('example.com', registrationDetails);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error registering domain example.com'));
  }, 30000);

  // Test error logging for registerMultipleDomains
  test('registerMultipleDomains logs error on failure', async () => {
    const logger = winston.createLogger();
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onGet('/domains/check').reply(200, { status: 'available' });
    mock.onPost('/domains/register').reply(500); // Simulate API error

    const domains = ['example1.com', 'example2.com'];
    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await registerMultipleDomains(domains, registrationDetails);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error registering domain'));
  }, 30000);

  // Test error logging for performRequest
  test('performRequest logs error on failure', async () => {
    const logger = winston.createLogger();
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onGet('/domains/check').reply(500); // Simulate API error

    const requestConfig = {
      method: 'get',
      url: '/domains/check',
      params: { domain: 'example.com', apikey: 'dummy', user: 'dummy' },
    };

    try {
      await performRequest(requestConfig);
    } catch (e) {
      // expected
    }

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Request failed'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed after'));
  }, 30000);
});
