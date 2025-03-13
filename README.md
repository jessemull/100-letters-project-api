## Project Overview

The **100 Letters Project API** powers the backend for the project's website, where the goal is to write and send 100 letters to 100 different individuals over the course of a year. The website showcases these correspondences, offering not only a digital display of the letters but also details about the recipients and the reasons behind their selection.

This API facilitates the management of the data needed for the website, allowing for the creation, retrieval, updating, and deletion of letters, recipients, and correspondences.

The API is designed for secure internal use, with write operations available only to admin users authenticated via AWS Cognito.

### Key Features:
- **CRUD Operations**: The API provides endpoints to create, retrieve, update, and delete letters, recipients, and correspondences.
- **Secure Admin Access**: Only authenticated admin users can interact with the write operations for letters, recipients, and correspondence data.
- **Integration with Next.js**: The API integrates seamlessly with the frontend of the website, providing the data for static pages generated during the build process.
- **DynamoDB**: The data is stored in three key DynamoDB tables (Letters, Recipients, Correspondences), enabling efficient querying and indexing for relationships between entities. The decision to move off RDS to DynamoDB was made to reduce costs, as DynamoDB offers a more cost-effective solution for the scale and access patterns of this project.

### Data Models:
- **Correspondences**: Each correspondence is linked to one recipient and can contain multiple letters. The correspondence includes information about the recipient's contributions or achievements, which is displayed on the website.
- **Recipients**: Each recipient represents an individual to whom a letter is sent. Recipients can be researched and updated with additional details such as their occupation, background, and reason for inclusion.
- **Letters**: Letters contain the actual text, status, and other metadata, along with an image of the letter.

The API supports the following primary endpoints:
- **/letter**: Manage individual letters (create, update, delete, get by ID).
- **/recipient**: Manage recipients (create, update, delete, get by ID).
- **/correspondence**: Manage correspondences (create, update, delete, get by ID).

This API is not publicly accessible and is secured via AWS Cognito for admin-only access. The **100 Letters Project** is driven by the desire to promote real human interaction in an increasingly digital world and create meaningful connections through handwritten communication.

---

## Tech Stack

The **100 Letters Project API** is built using the following technologies:

- **AWS Lambda**: Serverless compute for running backend logic and API functions. Lambda functions are responsible for handling API requests for CRUD operations on letters, recipients, and correspondences.
  
- **AWS API Gateway**: Exposes RESTful API endpoints to interact with Lambda functions, routing requests and responses for each operation related to the project’s data.

- **AWS DynamoDB**: A fully managed NoSQL database service for storing and managing data for letters, recipients, and correspondences. The choice of DynamoDB provides scalability and cost-effectiveness for the project's needs.
  
- **AWS Cognito**: Used for user authentication, ensuring that only admin users can perform write operations (create, update, delete) on the letters, recipients, and correspondence data.

- **Node.js**: The runtime environment used to build the Lambda functions. Express.js is used for routing HTTP requests in the API.
  
- **AWS SDK (DynamoDB Client)**: The DynamoDB client from AWS SDK is used to interact with the DynamoDB service for data management, including CRUD operations on the tables for letters, recipients, and correspondences.

- **AWS S3**: Used for storing images of the letters sent as part of the correspondences, allowing for easy retrieval and display on the website.

- **AWS CloudFormation**: Infrastructure as code (IaC) used to manage and provision AWS resources in a repeatable and consistent manner. CloudFormation templates are used to define the resources such as Lambda functions, API Gateway, Cognito, DynamoDB, and S3.

- **AWS IAM**: Used to manage permissions and security for resources and users, ensuring that Lambda functions and API Gateway are properly secured and authorized to interact with DynamoDB and other AWS services.

- **AWS CloudWatch**: Provides logging and monitoring for AWS Lambda functions, helping track the performance and issues in the API.

This tech stack provides a robust, scalable, and cost-effective solution for the **100 Letters Project**, ensuring the backend can handle the project's data management needs while keeping it secure and efficient.

## Setup Instructions

To clone the repository, install dependencies, and run the project locally, follow these steps:

1. Clone the repository:

    ```bash
    git clone https://github.com/jessemull/100-letters-project-api.git
    ```

2. Navigate into the project directory:

    ```bash
    cd 100-letters-project-api
    ```

3. Install the root dependencies and the dependencies for each route:

    ```bash
    npm install && npm run install:all
    ```

## Building & Packaging Bundle

### Summary

The build command runs `tsc` using a local `tsconfig.json` inside each route directory. 

This configuration outputs the build artifacts into a `dist/` folder within the corresponding route directory. 

Before building, a clean command removes the `dist` directory. 

After the build, a post-build script copies `package.json` and `package-lock.json` into the `dist/` folder, runs `npm install` within the `dist/` directory.

The package command then zips the contents of the `dist/` folder for lambda deployment.

Before building, ensure you have installed the root dependencies and any package dependencies:

### Building the Project

To build a single package:

```bash
npm run build-pkg <routeName>
```

To build all packages:

```bash
npm run build-all
```

### Packaging the Project

To package a single package after building:

```bash
npm run package:pkg <routeName>
```

To package all packages after building:

```bash
npm run package:all
```

## Commits and Commitizen

This project uses **Commitizen** to ensure commit messages follow a structured format and versioning is consisten. Commit linting is enforced via a pre-commit husky hook.

### Making a Commit

To make a commit in the correct format, run the following command. Commitzen will walk the user through the creation of a structured commit message and versioning. :

```bash
npm run commit
```

## Testing & Code Coverage

This project uses **Jest** for testing. Code coverage is enforced during every CI/CD pipeline, ensuring that the build will fail if any test fails or if coverage drops below **80%**.

### Testing Commands

Run tests for all routes/packages:

```bash
npm run test:all
```

Run tests for all routes/packages in watch mode:

```bash
npm run test:all:watch
```

Run tests for a single route/package:

```bash
npm run test:pkg <routeName>
```

Run tests for a single route/package in watch mode:

```bash
npm run test:pkg:watch <routeName>
```

### Code Coverage

Coverage thresholds are enforced at **80%** for all metrics. The build will fail if coverage drops below this threshold.

## Linting & Formatting

This project uses **ESLint** and **Prettier** for code quality enforcement. Linting is enforced during every CI/CD pipeline to ensure consistent standards.

### Linting Commands

Run linting for all routes/packages:

```bash
npm run lint:all
```

Run linting for all routes/packages with automatic fixes applied:

```bash
npm run lint:all:fix
```

Run linting for a single route/package files:

```bash
npm run lint:pkg <routeName>
```

Run linting for a single route/package with automatic fixes applied:

```bash
npm run lint:pkg:fix
```

### Formatting Commands

Format all routes/packages using prettier:

```bash
npm run format
```

Check if formatting matches the prettier rules:

```bash
npm run format:check
```

### Pre-Commit Hook

**Lint-staged** is configured to run linting before each commit. The commit will be blocked if linting fails, ensuring code quality at the commit level.

## Seeding/Reseting DynamoDB Tables

Use with extreme caution as these scripts will either seed mock data into DynamoDB tables or delete the data out of the tables entirely.

### Seeding DynamoDB Tables

To see the DynamoDB tables with mock data:

```bash
npm run db:seed
```

### Reseting DyanmoDB Tables

To reset the DynamoDB tables:

```bash
npm run db:reset
```

## Template Engine

A templating engine exists to scaffold out a new route.

### Creating A New Route

To create a new route run the following command. Replace the args below with the route name and the HTTP verb e.g. GET:

```bash
npm run create:route <routeName> <httpMethod>
```

## Connecting to the Bastion Host

To connect to the AWS EC2 instance bastion host and access AWS resources, you can use the following command:

```bash
npm run bastion
```
---