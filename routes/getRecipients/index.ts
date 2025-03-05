import { APIGatewayProxyHandler } from 'aws-lambda';
import { logger, prisma } from '../../common/util';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const recipients = await prisma.person.findMany({
      select: {
        id: true,
        name: true,
        address: true,
      },
    });
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: recipients,
      }),
    };
  } catch (error) {
    logger.error('Error fetching recipients: ', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
