# Domain Registration Bot using Hexonet API

This project is a domain registration bot that utilizes the Hexonet API to check domain availability and register domains. It is built using Node.js and includes features such as retry functionality, error handling, logging, and scheduled domain registration.

## Features

- Check domain availability
- Register a single domain
- Register multiple domains concurrently
- Retry failed requests with configurable delay and maximum retries
- Schedule domain registration at a precise time using cron syntax
- Detailed logging for errors and important events
- Comprehensive test suite for various scenarios

## Prerequisites

- Node.js and NPM installed on your machine

## Installation

1. Clone the repository:

```bash
git clone https://github.com/rydyr/reg-bot.git
```

2. Navigate to the project directory:

```bash
cd /PATHTO/reg-bot
```

3. Install the dependencies:

```bash
npm install
```

4. Create a `.env` file in the project root and add your Hexonet API credentials:

```plaintext
HEXONET_API_KEY=your_api_key_here
HEXONET_USER_ID=your_user_id_here
RETRY_DELAY=200
MAX_RETRIES=5
```

## Usage

### Registering a Single Domain

To register a single domain, you can use the `registerSingleDomain` function. Provide the domain name and registration details as arguments:

```javascript
const domain = 'example.com';
const registrationDetails = {
  // Add your registration details here
};

await registerSingleDomain(domain, registrationDetails);
```

### Registering Multiple Domains

To register multiple domains concurrently, you can use the `registerMultipleDomains` function. Provide an array of domain names and registration details as arguments:

```javascript
const domains = ['example1.com', 'example2.com', 'example3.com'];
const registrationDetails = {
  // Add your registration details here
};

await registerMultipleDomains(domains, registrationDetails);
```

### Scheduling Domain Registration

You can schedule domain registration at a precise time using the `scheduleRegistration` function. Provide a cron expression, domain name, and registration details as arguments:

```javascript
const cronTime = '30 2 * * *'; // Run at 02:30 AM every day
const domain = 'example.com';
const registrationDetails = {
  // Add your registration details here
};

scheduleRegistration(cronTime, domain, registrationDetails);
```

The cron expression syntax is as follows:

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

### Configuration

The bot uses the following environment variables for configuration:

- `HEXONET_API_KEY`: Your Hexonet API key
- `HEXONET_USER_ID`: Your Hexonet user ID
- `RETRY_DELAY`: The delay (in milliseconds) between retries when a request fails (default: 200)
- `MAX_RETRIES`: The maximum number of retries before giving up (default: 5)

You can modify these variables in the `.env` file.

## Testing

The project includes a comprehensive test suite using Jest. To run the tests, use the following command:

```bash
npm test
```

The tests cover various scenarios, including:

- Retry functionality
- Error handling
- Domain availability checks
- Domain registration
- Logging
- Scheduling

The test results show that the project has a high test coverage, with 96.55% statement coverage, 87.5% branch coverage, 91.66% function coverage, and 96.36% line coverage.

## Logging

The bot uses the `winston` library for logging. It logs errors and other relevant information to the following files:

- `error.log`: Contains error-level logs
- `combined.log`: Contains all logs

The logs include timestamps and are formatted as JSON for easy parsing and analysis.

## Deployment

To deploy the domain registration bot, follow these steps:

1. Choose a cloud platform (e.g., AWS, Google Cloud) and create a new instance.
2. Install Node.js and NPM on the instance.
3. Copy the bot code to the instance.
4. Set up the environment variables on the instance.
5. Run the bot using `node index.js`.

Make sure to configure the `RETRY_DELAY` and `MAX_RETRIES` environment variables according to your requirements.

## Error Handling

The bot includes robust error handling to deal with various scenarios:

- API request failures: The bot retries failed requests with a configurable delay and maximum number of retries. It logs the error details and continues execution.
- Domain availability: If a domain is not available, the bot logs an appropriate message and continues with the next domain (if applicable).
- Invalid responses: The bot handles invalid API responses and logs the error details for investigation.

## Contributing

Contributions to this project are welcome. If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
```
