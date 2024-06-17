// Import required packages
require('dotenv').config();
const axios = require('axios');
const winston = require('winston');
const cron = require('node-cron');

// Set up logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Set up Hexonet API
const hexonetApi = axios.create({
  baseURL: 'https://api.hexonet.net/v1',
});

// Configurable retry delay
const retryDelay = parseInt(process.env.RETRY_DELAY, 10) || 200; // 200 milliseconds by default
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES, 10) || 5; // Maximum number of retries

// Function to perform API request with retry
async function performRequest(requestConfig) {
  let retryCount = 0;
  while (retryCount < MAX_RETRIES) {
    try {
      const response = await hexonetApi(requestConfig);
      return response.data;
    } catch (error) {
      retryCount++;
      logger.error(`Request failed (attempt ${retryCount}): ${error.message}`);
      if (retryCount >= MAX_RETRIES) {
        logger.error(`Failed after ${MAX_RETRIES} retries: ${error.message}`);
        throw new Error(`Failed after ${MAX_RETRIES} retries: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Function to check domain availability
async function checkDomainAvailability(domain) {
  const requestConfig = {
    method: 'get',
    url: '/domains/check',
    params: {
      domain,
      apikey: process.env.HEXONET_API_KEY,
      user: process.env.HEXONET_USER_ID,
    },
  };
  return await performRequest(requestConfig);
}

// Function to register domain
async function registerDomain(domain, registrationDetails) {
  const requestConfig = {
    method: 'post',
    url: '/domains/register',
    data: {
      domain,
      apikey: process.env.HEXONET_API_KEY,
      user: process.env.HEXONET_USER_ID,
      ...registrationDetails,
    },
  };
  return await performRequest(requestConfig);
}

// Function to perform multiple asynchronous checks
async function performMultipleChecks(domains) {
  const promises = domains.map(domain => checkDomainAvailability(domain));
  return await Promise.all(promises);
}

// Main function to register a single domain
async function registerSingleDomain(domain, registrationDetails) {
  try {
    // Check domain availability
    const availability = await checkDomainAvailability(domain);
    if (availability.status === 'available') {
      // Register domain
      const registrationResponse = await registerDomain(domain, registrationDetails);
      logger.info(`Domain ${domain} registered successfully: ${registrationResponse}`);
    } else {
      logger.info(`Domain ${domain} is not available.`);
    }
  } catch (error) {
    logger.error(`Error registering domain ${domain}: ${error.message}`);
  }
}

// Main function to register multiple domains
async function registerMultipleDomains(domains, registrationDetails) {
  const results = await performMultipleChecks(domains);
  for (let i = 0; i < domains.length; i++) {
    try {
      if (results[i].status === 'available') {
        const registrationResponse = await registerDomain(domains[i], registrationDetails);
        logger.info(`Domain ${domains[i]} registered successfully: ${registrationResponse}`);
      } else {
        logger.info(`Domain ${domains[i]} is not available.`);
      }
    } catch (error) {
      logger.error(`Error registering domain ${domains[i]}: ${error.message}`);
    }
  }
}

// Function to schedule domain registration at a precise time
function scheduleRegistration(cronTime, domain, registrationDetails) {
  cron.schedule(cronTime, () => {
    registerSingleDomain(domain, registrationDetails);
  });
}

// Main function
async function main() {
  const domain = 'example.com';
  const registrationDetails = {
    // Add your registration details here
  };

  // Schedule registration at a precise time (optional)
  // Example: '30 2 * * *' will run at 02:30 AM every day
  // Timer syntax provided at end of document
  scheduleRegistration('30 2 * * *', domain, registrationDetails);

  // Immediate registration (optional)
  // await registerSingleDomain(domain, registrationDetails);

  // Perform multiple asynchronous checks and registrations (optional)
  // const domains = ['example1.com', 'example2.com', 'example3.com'];
  // await registerMultipleDomains(domains, registrationDetails);
}

// Export functions for testing
module.exports = {
  performRequest,
  checkDomainAvailability,
  registerDomain,
  performMultipleChecks,
  registerSingleDomain,
  registerMultipleDomains,
  scheduleRegistration,
  hexonetApi // Export the hexonetApi instance
};

// Run main function
main();
