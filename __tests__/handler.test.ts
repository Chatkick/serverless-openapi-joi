import Boom from '@hapi/boom';
import OpenAPIHandler from '../src/handler';
import { routes, dummyHandler } from './util/routes';
import { extend, ExtendedMatchers } from './util/jest-openapi';
import { APIGatewayEventRequestContextV2, APIGatewayProxyEventV2 } from 'aws-lambda';
extend(expect);

const openapi = new OpenAPIHandler({
  info: {
    title: 'Pet API',
    version: '1.0.0',
  },
  swaggerEndpoint: '/openapi.json',
  routes,
});

describe('Handler', () => {
  test('handler returns valid openapi v3 at /swagger.json', async () => {
    const res = await openapi.handler(
      {
        rawPath: '/openapi.json',
      },
      { http: { method: 'GET', path: '/openapi.json' } } as APIGatewayEventRequestContextV2,
    );
    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res?.body.toString());
    (expect(json) as ExtendedMatchers).toBeValidOpenAPI();
  });

  test('handler throws a 404 not found with unknown route', async () => {
    const res = openapi.handler(
      {
        rawPath: '/unknown-route',
      },
      { http: { method: 'GET', path: '/openapi.json' } } as APIGatewayEventRequestContextV2,
    );
    expect(res).rejects.toThrowError(
      Boom.badRequest('Route not found. Hint: Route definition missing for GET /unknown-route ?'),
    );
    expect(res).rejects.toThrowErrorMatchingSnapshot();
  });

  test('handler passes through to handler if validation passes', async () => {
    const event = ({
      rawPath: '/pets/1',
      pathParameters: { id: '1' },
    } as any) as APIGatewayProxyEventV2;
    const context = {
      http: { method: 'GET', path: '/pets/1' },
    } as APIGatewayEventRequestContextV2;
    const res = await openapi.handler(event, context);

    expect(dummyHandler).lastCalledWith(event, context);
    expect(res.statusCode).toBe(200);
  });

  test('handler passes parsed payload as object', async () => {
    const payload = { name: 'test' };

    const event = ({
      body: JSON.stringify(payload),
      rawPath: '/pets',
    } as any) as APIGatewayProxyEventV2;
    const context = {
      http: { method: 'POST', path: '/pets' },
    } as APIGatewayEventRequestContextV2;
    const res = await openapi.handler(event, context);

    expect(dummyHandler).lastCalledWith({ ...event, payload }, context);
    expect(res.statusCode).toBe(200);
  });

  test('handler throws a validation error with invalid path param', async () => {
    const res = openapi.handler(
      {
        rawPath: '/pets/asd',
        pathParameters: { id: 'asd' },
      },
      { http: { method: 'GET', path: '/pets' } } as APIGatewayEventRequestContextV2,
    );
    await expect(res).rejects.toThrowError(Boom.notAcceptable('"PetId" must be a number'));
    //await expect(res).rejects.toThrowErrorMatchingSnapshot();
  });

  test('handler throws a validation error with invalid query param', async () => {
    const res = openapi.handler(
      {
        rawPath: '/pets?limit=-1',
        queryStringParameters: { limit: '-1' },
      },
      { http: { method: 'GET', path: '/pets' } } as APIGatewayEventRequestContextV2,
    );
    await expect(res).rejects.toThrowError(Boom.badRequest('"QueryLimit" must be a positive number'));
    //await expect(res).rejects.toThrowErrorMatchingSnapshot();
  });

  test('handler throws a validation error with invalid payload', async () => {
    const res = openapi.handler(
      {
        rawPath: '/pets',
        body: JSON.stringify({ incorrect: 'param' }),
      },
      { http: { method: 'POST', path: '/pets' } } as APIGatewayEventRequestContextV2,
    );
    await expect(res).rejects.toThrowError(Boom.badRequest('"PetName" is required'));
    //await expect(res).rejects.toThrowErrorMatchingSnapshot();
  });
});
