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
  hexonetApi,
  logger 
} = require('../index');
const winston = require('winston');

// Set up mock adapter
const mock = new MockAdapter(hexonetApi);

// Mock the cron.schedule function
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

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
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onGet('/domains/check').reply(500); // Simulate API error

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await registerSingleDomain('example.com', registrationDetails);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error registering domain example.com'));
  }, 30000);

  // Test error logging for registerMultipleDomains
  test('registerMultipleDomains logs error on failure', async () => {
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

  test('checkDomainAvailability returns availability status', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'available' });

    const availability = await checkDomainAvailability('example.com');
    expect(availability.status).toBe('available');
  }, 30000); // Increase timeout to 30 seconds

  test('registerDomain registers the domain', async () => {
    mock.onPost('/domains/register').reply(200, { result: 'success' });

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    const result = await registerDomain('example.com', registrationDetails);
    expect(result.result).toBe('success');
  }, 30000); // Increase timeout to 30 seconds

  test('performMultipleChecks checks multiple domains concurrently', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'available' });

    const domains = ['example1.com', 'example2.com'];
    const results = await performMultipleChecks(domains);
    expect(results.length).toBe(2);
    expect(results[0].status).toBe('available');
    expect(results[1].status).toBe('available');
  }, 30000); // Increase timeout to 30 seconds

  // Test error handling for performRequest
  test('performRequest logs and throws detailed error on failure', async () => {
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onGet('/domains/check').reply(500, { message: 'Internal Server Error' });

    const requestConfig = {
      method: 'get',
      url: '/domains/check',
      params: { domain: 'example.com', apikey: 'dummy', user: 'dummy' },
    };

    await expect(performRequest(requestConfig)).rejects.toThrow('Failed after 5 retries: Internal Server Error');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Request failed (attempt 1): Internal Server Error'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed after 5 retries: Internal Server Error'));
  }, 30000);

  // Test error handling for checkDomainAvailability
  test('checkDomainAvailability handles network error', async () => {
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onGet('/domains/check').networkError();

    await expect(checkDomainAvailability('example.com')).rejects.toThrow('Network Error');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Request failed (attempt 1): Network Error'));
  }, 30000);

  // Test error handling for registerDomain
  test('registerDomain handles invalid response', async () => {
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onPost('/domains/register').reply(400, { message: 'Bad Request' });

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await expect(registerDomain('example.com', registrationDetails)).rejects.toThrow('Failed after 5 retries: Bad Request');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Request failed (attempt 1): Bad Request'));
  }, 30000);

  // Helper function to extract error message
  function getErrorMessage(error) {
    if (error.response) {
      return error.response.data.message || JSON.stringify(error.response.data);
    } else if (error.request) {
      return 'No response received';
    } else {
      return error.message;
    }
  }

  // Test error handling for performRequest
  test('performRequest logs and throws detailed error on failure', async () => {
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onGet('/domains/check').reply(500, { message: 'Internal Server Error' });

    const requestConfig = {
      method: 'get',
      url: '/domains/check',
      params: { domain: 'example.com', apikey: 'dummy', user: 'dummy' },
    };

    await expect(performRequest(requestConfig)).rejects.toThrow('Failed after 5 retries: Internal Server Error');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Request failed (attempt 1): Internal Server Error'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed after 5 retries: Internal Server Error'));
  }, 30000);

  // Test error handling for checkDomainAvailability
  test('checkDomainAvailability handles network error', async () => {
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onGet('/domains/check').networkError();

    await expect(checkDomainAvailability('example.com')).rejects.toThrow('Network Error');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Request failed (attempt 1): Network Error'));
  }, 30000);

  // Test error handling for registerDomain
  test('registerDomain handles invalid response', async () => {
    const errorSpy = jest.spyOn(logger, 'error');

    mock.onPost('/domains/register').reply(400, { message: 'Bad Request' });

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    await expect(registerDomain('example.com', registrationDetails)).rejects.toThrow('Failed after 5 retries: Bad Request');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Request failed (attempt 1): Bad Request'));
  }, 30000);
});
