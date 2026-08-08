import path from 'path';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';
import { DeleteObjectCommand, s3 } from '../../common/util/s3';

const UUID =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

/**
 * Resolve S3 keys to delete from a stored fileKey.
 *
 * Supported shapes:
 * - Upload flow: `unprocessed/{corr}___{letter}___{view}___{uuid}.{ext}`
 * - Bare upload basename (tests / legacy): `{corr}___{letter}___{view}___{uuid}.{ext}`
 * - Processed / seed: `images/{corr}/{letter}/{view}/{uuid}_large.jpg` (also `_thumb`, `_large_N`)
 */
export const resolveDeleteKeys = (fileKey: string): string[] | null => {
  const decoded = decodeURIComponent(fileKey);
  const ext = path.extname(decoded);
  const fileName = path.basename(decoded, ext);

  if (fileName.includes('___')) {
    const parts = fileName.split('___');
    if (parts.length !== 4) {
      return null;
    }

    const [correspondenceId, letterId, view, uuid] = parts;
    const basePath = `images/${correspondenceId}/${letterId}/${view}/${uuid}`;

    return [decoded, `${basePath}_thumb.jpg`, `${basePath}_large.jpg`];
  }

  const processed = new RegExp(
    `^images\\/([^/]+)\\/([^/]+)\\/([^/]+)\\/(${UUID})(?:_large(?:_\\d+)?|_thumb)?(\\.[^.]+)$`,
    'i',
  ).exec(decoded);

  if (!processed) {
    return null;
  }

  const [, correspondenceId, letterId, view, uuid, processedExt] = processed;
  const basePath = `images/${correspondenceId}/${letterId}/${view}/${uuid}`;
  const extension = processedExt || '.jpg';

  return [
    ...new Set([
      decoded,
      `${basePath}_thumb.jpg`,
      `${basePath}_large.jpg`,
      `unprocessed/${correspondenceId}___${letterId}___${view}___${uuid}${extension}`,
      `unprocessed/${correspondenceId}___${letterId}___${view}___${uuid}.jpg`,
    ]),
  ];
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    const { fileKey } = event.queryStringParameters || {};

    if (!fileKey) {
      return new BadRequestError('Missing file key!').build(headers);
    }

    const keys = resolveDeleteKeys(fileKey);

    if (!keys) {
      return new BadRequestError(`Invalid file key format: ${fileKey}`).build(
        headers,
      );
    }

    const bucket = process.env.IMAGE_S3_BUCKET_NAME!;
    await Promise.all(
      keys.map((Key) =>
        s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key,
          }),
        ),
      ),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image and variants deleted successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error deleting image: ', error);
    return new DatabaseError('Error deleting image.').build(headers);
  }
};
