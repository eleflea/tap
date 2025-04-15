# GPT Data Tagger & Analyzer

## 📘 Overview

The **GPT Data Tagger & Analyzer** is a cloud-native system that leverages the ChatGPT API to analyze and tag cybersecurity threat data sourced from open intelligence feeds. Designed for both **scheduled and real-time queries**, it uses structured prompts to extract actionable insights such as:

- Attack vectors  
- Tactics, Techniques, and Procedures (TTPs)  
- Other key indicators of compromise (IOCs)

Deployed on **AWS**, the platform provides timely, precise responses to cybersecurity questions—such as the **ransomware attack lifecycle** or threat-specific TTPs to enhance threat detection, investigation, and response.

---

## ⚙️ Prerequisites

Before setting up the project, ensure you have the following installed and configured:

1. **AWS Account** – Active and accessible
2. **AWS CLI** – Installed and configured (`aws configure`)  
3. **AWS CDK** – Installed globally (`npm install -g aws-cdk`)
4. **Node.js** – Version `v20.13.1`
5. **npm** – Version `10.5.2`
6. **CDK Version** – `2.152.0`

---

## 🛠️ Development Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd <repo-folder>
   ```

2. **Update AWS Account**
   - In `bin/tap.ts`, update your AWS account number on **line 17**.

3. **Configure AWS Credentials**
   - Create access keys via IAM.
   - Run:
     ```bash
     aws configure
     ```

4. **Setup Environment Variables**
   - Copy `.env.example` to `.env.local` and fill in:
     - `API_KEY`
     - GitHub credentials
     - Any other required secrets

5. **Install dependencies**
   ```bash
   npm install
   ```

6. **Deploy the stack**
   ```bash
   cdk synth
   cdk bootstrap
   cdk deploy TapStack --require-approval never
   ```

---

## 🚀 Running the API

To test the system:

1. The URL of the client web application is provided under the output value named AmplifyAppUrl.
2. The endpoint URL of the ChatGPT function is provided under the output value named ChatGPTUrl.

---

## 🧰 Useful Commands

| Command | Description |
|--------|-------------|
| `npm install` | Install project dependencies |
| `cdk synth` | Generate the CloudFormation template |
| `cdk bootstrap` | Set up resources needed for deployment |
| `cdk deploy TapStack` | Deploy the CDK stack |
| `cdk deploy TapStack --require-approval never` | Deploy without approval prompt |
| `cdk destroy --all` | Remove all deployed stacks |

---