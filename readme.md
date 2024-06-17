# Domain Registration Bot using Hexonet API

## Setting Up the Environment

### Step 1: Install Node.js and NPM

Download and install Node.js and NPM from the [official website](https://nodejs.org/en/download/).

### Step 2: Create Project Directory and Install Dependencies

```bash
mkdir domain-registration-bot
cd domain-registration-bot
npm init -y
npm install axios dotenv winston node-cron jest
```

### Step 3: Set Up Environment Variables

Create a `.env` file and add your Hexonet API credentials and retry delay:

```plaintext
HEXONET_API_KEY=your_api_key_here
HEXONET_USER_ID=your_user_id_here
RETRY_DELAY=200
```

### Step 4: Create a New GitHub Repository

1. Go to [GitHub](https://github.com/) and log in to your account.
2. Click on the `+` icon in the top right corner and select `New repository`.
3. Enter a name for your repository (e.g., `domain-registration-bot`).
4. Add a description (optional).
5. Choose `Public` or `Private` visibility.
6. Do not initialize with a README, .gitignore, or license for now.
7. Click `Create repository`.

### Step 5: Initialize Git in Your Project Directory

In your terminal, navigate to your project directory and initialize Git:

```bash
cd path/to/your/project
git init
```

### Step 6: Add Your Files and Commit

Add all your files to the staging area and commit them:

```bash
git add .
git commit -m "Initial commit"
```

### Step 7: Add Remote Repository

Add your GitHub repository as a remote:

```bash
git remote add origin https://github.com/your-username/domain-registration-bot.git
```

### Step 8: Push Your Code to GitHub

Push your code to the master branch of your GitHub repository:

```bash
git push -u origin master
```

### Step 9: Set Up a .gitignore File

Create a `.gitignore` file in your project directory to exclude files and directories that should not be tracked by Git. Here’s an example `.gitignore` file for a Node.js project:

```plaintext
node_modules/
.env
*.log
```

### Step 10: Update README.md

Create a `README.md` file to provide an overview of your project, including setup instructions and usage examples.




### Step 11: Create `index.js`

Create an `index.js` file and add the following code:

```javascript
// Import required packages
require('dotenv').config();
const axios = require('axios');
const winston = require('winston');
const cron = require('node-cron');

// Set up logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
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

// Function to perform API request with retry
async function performRequest(requestConfig) {
  while (true) {
    try {
      const response = await hexonetApi(requestConfig);
      return response.data;
    } catch (error) {
      logger.error(error);
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
  // Check domain availability
  const availability = await checkDomainAvailability(domain);
  if (availability.status === 'available') {
    // Register domain
    const registrationResponse = await registerDomain(domain, registrationDetails);
    logger.info(`Domain ${domain} registered successfully:`, registrationResponse);
  } else {
    logger.info(`Domain ${domain} is not available.`);
  }
}

// Main function to register multiple domains
async function registerMultipleDomains(domains, registrationDetails) {
  const results = await performMultipleChecks(domains);
  for (let i = 0; i < domains.length; i++) {
    if (results[i].status === 'available') {
      const registrationResponse = await registerDomain(domains[i], registrationDetails);
      logger.info(`Domain ${domains[i]} registered successfully:`, registrationResponse);
    } else {
      logger.info(`Domain ${domains[i]} is not available.`);
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

// Run main function
main();
```

### Implementing Unit Tests

### Step 1: Set Up Jest

Add the following configuration to `package.json` to set up Jest:

```json
"scripts": {
  "test": "jest"
}
```

### Step 2: Create Tests

Create a `__tests__` directory and add test files for each function. Here are some example tests:

#### `__tests__/index.test.js`

```javascript
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { performRequest, checkDomainAvailability, registerDomain, performMultipleChecks } = require('../index');

// Set up mock adapter
const mock = new MockAdapter(axios);

describe('Domain Registration Bot', () => {
  afterEach(() => {
    mock.reset();
  });

  test('performRequest retries on failure', async () => {
    mock.onGet('/domains/check').replyOnce(500).onGet('/domains/check').reply(200, { status: 'available' });

    const requestConfig = {
      method: 'get',
      url: '/domains/check',
      params: { domain: 'example.com', apikey: 'dummy', user: 'dummy' },
    };

    const data = await performRequest(requestConfig);
    expect(data).toEqual({ status: 'available' });
  });

  test('checkDomainAvailability returns availability status', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'available' });

    const availability = await checkDomainAvailability('example.com');
    expect(availability.status).toBe('available');
  });

  test('registerDomain registers the domain', async () => {
    mock.onPost('/domains/register').reply(200, { result: 'success' });

    const registrationDetails = { apikey: 'dummy', user: 'dummy' };
    const result = await registerDomain('example.com', registrationDetails);
    expect(result.result).toBe('success');
  });

  test('performMultipleChecks checks multiple domains concurrently', async () => {
    mock.onGet('/domains/check').reply(200, { status: 'available' });

    const domains = ['example1.com', 'example2.com'];
    const results = await performMultipleChecks(domains);
    expect(results.length).toBe(2);
    expect(results[0].status).toBe('available');
    expect(results[1].status).toBe('available');
  });
});
```

### Step 3: Run the Tests

Run the tests using the following command:

```bash
npm test
```

### Step 4: Analyze Test Results

Ensure all tests pass. If any tests fail, investigate the cause, fix the code, and rerun the tests.

### Final Commit and Push

1. **Ensure all files are added and committed**

Make sure all the necessary files are added to your Git repository and that you have committed your changes. You can check the status of your files with:

```bash
git status
```

If there are files that need to be added, use:

```bash
git add .
```

2. **Commit your changes**

Commit your changes with a meaningful commit message:

```bash
git commit -m "Added initial bot implementation, tests, and setup documentation"
```

3. **Push your changes to GitHub**

Push your changes to the master branch of your remote repository:

```bash
git push origin master
```

### Example of Full Commands Sequence

```bash
# Check the status of the repository
git status

# Add all files to the staging area
git add .

# Commit the changes with a meaningful message
git commit -m "Added initial bot implementation, tests, and setup documentation"

# Push the changes to the remote repository on GitHub
git push origin master
```

### Verification

After pushing your changes, you can verify that your files are correctly uploaded by visiting your GitHub repository at `https://github.com/your-username/domain-registration-bot`.

### Typical Files and Structure

Here is what your project directory might look like before the final commit and push:

```
domain-registration-bot/
├── .env
├── .gitignore
├── README.md
├── index.js
├── package.json
├── node_modules/
└── __tests__/
    └── index.test.js
```

## Deployment

### Step 1: Choose a Cloud Platform

- Choose a cloud platform such as AWS or Google Cloud.
- Create a new instance with a low latency server close to the Hexonet API server.

### Step 2: Install Node.js and NPM on the Instance

### Step 3: Copy the Bot Code to the Instance

### Step 4: Run the Bot

```bash
node index.js
```

### Note

Configure the `RETRY_DELAY` environment variable to a suitable value for your use case.

---


### Explanation of the Timer Syntax

The timer syntax used in the `scheduleRegistration` function is a cron expression. Cron expressions are used to define scheduled tasks. The format for a cron expression is:

```
* * * * * *
| | | | | |
| | | | | +-- Day of the Week   (0 - 7) (Sunday is both 0 and 7)
| | | | +---- Month              (1 - 12)
| | | +------ Day of the Month   (1 - 31)
| | +-------- Hour               (0 - 23)
| +---------- Minute             (0 - 59)
+------------ Second (optional)  (0 - 59)
```

Each field can contain specific values or ranges:
- `*` means any value.
- A specific number (e.g., `5`) means that specific value.
- A range (e.g., `1-5`) means any value within the range.
- Multiple values separated by commas (e.g., `1,2,3`).
