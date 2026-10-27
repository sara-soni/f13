import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "./env.js";

const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {
  region: env.AWS_REGION,
};

if (env.DYNAMODB_ENDPOINT && env.DYNAMODB_ENDPOINT.trim() !== "") {
  clientConfig.endpoint = env.DYNAMODB_ENDPOINT;
  // Dummy credentials for DynamoDB Local
  clientConfig.credentials = {
    accessKeyId: "localAccessKey",
    secretAccessKey: "localSecretKey",
  };
}

export const rawDynamoClient = new DynamoDBClient(clientConfig);

export const docClient = DynamoDBDocumentClient.from(rawDynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});
