# 100 Letters Project API

The **100 Letters Project** is driven by the desire to promote real human interaction in an increasingly digital world and create meaningful connections through handwritten communication. Over the course of a year I will write 100 letters to 100 individuals. 

The **100 Letters Project** website showcases these exchanges, offering a digital display of the letters with details about the recipients and the reasons behind their selection. 

The **100 Letters Project API** provides the backend services for the **100 Letters Project** website, managing the data required for the website including the creation, retrieval, update, and deletion of letters, recipients, and correspondences.

## Table of Contents
1. [API Documentation](#api-documentation)
2. [Tech Stack](#tech-stack)
3. [Setup Instructions](#setup-instructions)
4. [Commits and Commitizen](#commits-and-commitizen)
5. [Linting & Formatting](#linting--formatting)
    - [Linting Commands](#linting-commands)
    - [Formatting Commands](#formatting-commands)
    - [Pre-Commit Hook](#pre-commit-hook)
6. [Testing & Code Coverage](#testing--code-coverage)
    - [Testing Commands](#testing-commands)
    - [Code Coverage](#code-coverage)
7. [Building & Packaging Bundle](#building--packaging-bundle)
    - [Install](#install)
    - [Build](#build)
    - [Package](#package)
8. [Deployment Pipelines](#deployment-pipelines)
    - [Deployment Strategy](#deployment-strategy)
    - [Tools Used](#tools-used)
    - [Pull Request](#pull-request)
    - [Deploy Lambda](#deploy-lambda)
    - [Deploy All Lambdas](#deploy-all-lambdas)
    - [Deploy On Merge](#deploy-on-merge)
    - [Rollback Lambda](#rollback-lambda)
9. [Seeding & Reseting DynamoDB Tables](#seeding--reseting-dynamodb-tables)
    - [Seeding DynamoDB Tables](#seeding-dynamodb-tables)
    - [Reseting DynamoDB Tables](#reseting-dyanmodb-tables)
10. [Templating Engine](#templating-engine)
    - [Creating A New Route](#creating-a-new-route)
10. [Connecting to the Bastion Host](#connecting-to-the-bastion-host)
    - [Environment Variables](#environment-variables)
11. [License](#license)

## API Documentation

The API endpoints for this project are documented in the OpenAPI v3 format. For detailed information on all available endpoints, request/response formats, and data structures, please refer to the [OpenAPI YAML file](./api.yaml).

Alternatively, you can view the interactive API documentation using tools like [Swagger UI](https://swagger.io/tools/swagger-ui/) or [ReDoc](https://github.com/Redocly/redoc), by hosting the YAML file locally or on a web server.

The API is designed for secure internal use with write operations available only to users authenticated via AWS Cognito and CORS protection for the 100 letters domains.

### Key Features:
- **CRUD**: Create, retrieve, update, and delete letters, recipients, and correspondences.
- **Security**: Cognito authenticated users can perform write operations.
- **Next.js**: Provides read data as props during static site generation.
- **DynamoDB**: Data is stored in three tables for letters, recipients and correspondence. 

The **100 Letters Project** data is relational and the project used AWS RDS services initially. DynamoDB reduces costs significantly.

### Data Models:
- **Correspondences**: A correspondence is a set of letters and a recipient with meta-data attached including the reason for the correspondence.
- **Recipients**: Information about a letter-worthy individual including name, address, occupation and other information.
- **Letters**: The letter information including image URLs, dates and other information.

The API supports the following primary endpoints:
- **/letter**: Manage individual letters (Create, Update, Delete, Get by ID).
- **/recipient**: Manage recipients (Create, Update, Delete, Get by ID).
- **/correspondence**: Manage correspondences (Create, Update, Delete, Get by ID).

---

## Tech Stack

The **100 Letters Project API** is built using the following technologies:

- **AWS Lambda**: Serverless compute for running backend logic and API functions. Lambda functions are responsible for handling API requests for CRUD operations on letters, recipients, and correspondences.
  
- **AWS API Gateway**: Exposes RESTful API endpoints to interact with functions, routing requests and responses for each operation related to the project’s data.

- **AWS DynamoDB**: A fully managed NoSQL database service for storing and managing data for letters, recipients, and correspondences. The choice of DynamoDB provides scalability and cost-effectiveness for the project's needs.
  
- **AWS Cognito**: Used for user authentication, ensuring that only admin users can perform write operations (create, update, delete) on the letters, recipients, and correspondence data.

- **Node.js**: The runtime environment used to build the Lambda functions.
  
- **AWS SDK (DynamoDB Client)**: The DynamoDB client from AWS SDK is used to interact with the DynamoDB service for data management, including CRUD operations on the tables for letters, recipients, and correspondences.

- **AWS S3**: Used for storing images of the letters sent as part of the correspondences, allowing for easy retrieval and display on the website.

- **AWS CloudFormation**: Infrastructure as code (IaC) used to manage and provision AWS resources in a repeatable and consistent manner. CloudFormation templates are used to define the resources such as Lambda functions, API Gateway, Cognito, DynamoDB, and S3.

- **AWS IAM**: Used to manage permissions and security for resources and users, ensuring that Lambda functions and API Gateway are properly secured and authorized to interact with DynamoDB and other AWS services.

- **AWS CloudWatch**: Provides logging and monitoring for AWS Lambda functions, helping track the performance and issues in the API.

This tech stack provides a robust, scalable, and cost-effective solution for the **100 Letters Project**, ensuring the backend can handle the project's data management needs while keeping it secure and efficient.

## Setup Instructions

To clone the repository, install dependencies, and run the project locally follow these steps:

1. Clone the repository:

    ```bash
    git clone https://github.com/jessemull/100-letters-project-api.git
    ```

2. Navigate into the project directory:

    ```bash
    cd 100-letters-project-api
    ```

3. Install the root dependencies:

    ```bash
    npm install
    ```

4. Install the dependencies for each route:

    ```bash
    npm run install:all
    ```

## Commits and Commitizen

This project uses **Commitizen** to ensure commit messages follow a structured format and versioning is consisten. Commit linting is enforced via a pre-commit husky hook.

### Making a Commit

To make a commit in the correct format, run the following command. Commitzen will walk the user through the creation of a structured commit message and versioning. :

```bash
npm run commit
```

## Testing & Code Coverage

This project uses **Jest** for testing. Code coverage is enforced during every CI/CD pipeline. The build will fail if any tests fail or coverage drops below **80%**.

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

## Building & Packaging Bundle

### Summary

The build command runs `tsc` using a local `tsconfig.json` inside each route directory and outputs the build artifacts into a `dist/` folder. 

Pre-build, a clean command removes the `dist` directory. Post-build, a script copies `package.json` and `package-lock.json` into the `dist/` folder and runs `npm install` within the `dist/` directory.

The package command zips the contents of the `dist/` folder for the lambda deployment. Before running a build, ensure you have installed the root dependencies used by the common packages.

### Install

To install the root dependencies:

```bash
npm install
```

To install the dependencies for all routes:

```bash
npm run install:all
```

To install the dependencies for a single route:

```bash
npm run install:pkg <routeName>
```

### Build

To build a single package:

```bash
npm run build-pkg <routeName>
```

To build all packages:

```bash
npm run build-all
```

### Package

To package a single package after building:

```bash
npm run package:pkg <routeName>
```

To package all packages after building:

```bash
npm run package:all
```

## Deployment Pipelines

This project uses automated deployment pipelines to ensure a smooth and reliable deployment process utilizing AWS CloudFormation, GitHub Actions, and S3.

### Deployment Strategy

Each deployment process involves:

- **Versioned Artifacts:** Functions are bundled and uploaded as zipped packages to Amazon S3. These packages are versioned using a unique artifact name, ensuring that each deployment has a distinct, traceable version.
- **CloudFormation:** AWS CloudFormation change sets are used to manage and deploy functions. This tool allows us to define, update, and roll back the infrastructure in a repeatable and consistent way.
- **Parallel/Conditional Deployment:** Deployments are either executed for a single function or triggered in parallel for all functions. On merge, only functions with source file changes are deployed.
- **Rollback:** Deployments can be rolled back to a prior version using previously stored S3 bundles.
  
### Tools Used

- **AWS CLI**: Configures the AWS environment for deployments.
- **GitHub Actions**: Automates and schedules the deployment and rollback pipelines.
- **CloudFormation**: Orchestrates infrastructure changes, including deployments and rollbacks.
- **S3**: Stores function packages for deployment and rollback.

### Pull Request

The Pull Request Pipeline is triggered when a pull request is opened against the `main` branch. This pipeline performs the following steps:

1. **Linting:** Runs linting checks.
2. **Testing:** Runs unit tests.
3. **Code Coverage:** Checks code coverage remains above 80%.

This pipeline is defined in the `.github/workflows/lint-and-test.yml` file.

### Deploy Lambda

This pipeline handles the heavy lifting for deploying a single lambda. The pipelines below will dispatch this GitHub action to deploy multiple lambdas in parallel at one time. The pipeline can be triggered manually from the GitHub Actions interface after selecting the appropriate function to deploy.

The pipeline performs the following steps:

1. **Checkout Code:** Checks out code.
2. **Set Up AWS CLI:** Configures AWS credentials.
3. **Build Lambda Package:** Installs dependencies. Builds and packages files into a zip bundle for S3.
4. **Generate Artifact Name:** Generates a unique artifact name using the timestamp and hash commit.
5. **Upload Lambda to S3:** Uploads the zipped function to an S3 bucket for storage.
6. **Check Change Set Type:** Checks change set create vs update.
7. **Check Stack Status:** Checks the status of the existing stack. Deletes stack to recover.
8. **Create CloudFormation Change Set:** Creates a CloudFormation change set for deploying the function.
9. **Check for Applied Changes:** Verifies there are changes to apply in the change set.
10. **Execute CloudFormation Change Set:** Executes the change set and deploys the function to AWS.
11. **Monitor CloudFormation Stack Status:** Monitors the status of the CloudFormation stack during the deployment process.
12. **Prune Backups:** Prunes older bundle versions.

This pipeline is defined in the `.github/workflows/deploy-lambda.yml` file.

### Deploy All Lambdas

This pipeline triggers the deployment of all functions in the mono-repo simultaneously. This pipeline dispatches the **Deploy Lambda** pipeline for each individual function, allowing for parallel deployment of multiple functions. The pipeline can be triggered manually from the GitHub Actions interface.

The pipeline performs the following steps:

1. **Checkout Code:** Checks out code.
2. **Get Lambda Names:** Scans the `src/routes/` for function discovery.
3. **Deploy All Lambdas:** Dispatches the **Deploy Lambda** pipeline for each function.

This pipeline is defined in the `.github/workflows/deploy-all-lambdas.yml` file.

### Deploy On Merge

This pipeline is triggered when code is merged into `main`. It identifies which functions have been modified and deploys any modified functions by dispatching the **Deploy Lambda** pipeline for each function.

The pipeline performs the following steps:

1. **Checkout Code:** Checks out code.
2. **Get Changed Files:** Uses `git rev-parse` to detect file changes.
3. **List Changed Files:** Outputs the list of changed files.
4. **Check Modified Files:** Identifies modified functions.
5. **Deploy Lambdas:** Dispatches the **Deploy Lambda** pipeline for each modified function.

This pipeline is defined in the `.github/workflows/deploy-lambdas-on-merge.yml` file.

### Rollback Lambda

The Rollback Lambda pipeline allows you to roll back a function to a previous version stored in S3. This pipeline is triggered manually by providing the name of the function and zipped bundle in S3.

The pipeline performs the following steps:

1. **Checkout Code:** Checks out the code.
2. **Set Up AWS CLI:** Configures AWS credentials for AWS CLI.
3. **Check Change Set Type:** Checks change set create vs update.
4. **Check Stack Status:** Checks the status of the existing stack. Deletes stack to recover.
5. **Create CloudFormation Change Set:** Creates a CloudFormation change set for deploying the function.
6. **Execute CloudFormation Change Set:** Executes the change set and deploys the function to AWS.
7. **Monitor CloudFormation Stack Status:** Monitors the status of the CloudFormation stack during the deployment process.

This pipeline is defined in the `.github/workflows/rollback-lambda.yml` file.

## Seeding & Reseting DynamoDB Tables

Use with extreme caution as these scripts will either seed mock data into DynamoDB tables or delete the data out of the tables entirely.

### Seeding DynamoDB Tables

To seed DynamoDB tables with mock data:

```bash
npm run db:seed
```

### Reseting DyanmoDB Tables

To reset DynamoDB tables:

```bash
npm run db:reset
```

## Templating Engine

A templating engine exists to scaffold out a new route.

### Creating A New Route

To create a new route run the following command. Replace the args below with the route name and the HTTP verb e.g. GET:

```bash
npm run create:route <routeName> <httpMethod>
```

## Connecting to the Bastion Host

To connect to the AWS EC2 bastion host and access AWS resources, you can use the following command:

```bash
npm run bastion
```

### Environment Variables

The following environment variables must be set in a `.env` file in the root of the project:

```
SSH_PRIVATE_KEY_PATH=/path/to/your/private/key
SSH_USER=your-ssh-username
SSH_HOST=your-ec2-instance-hostname-or-ip
```

Ensure you have the appropriate permissions set on your SSH key for secure access.

## License

    Apache License
    Version 2.0, January 2004
    http://www.apache.org/licenses/

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

---