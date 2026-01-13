import { setupServer } from 'msw/node';
import fs from 'fs';
import _ from 'lodash';
import SIMULATED_CARGOFIVE_RESPONSE from './SIMULATED_CARGOFIVE_RESPONSE.json';
import EXPECTED_RESULT from './EXPECTED_RESULT.json';
const { http, HttpResponse } = require('msw');
const { Server: CargofiveServer, ConfigurationErrorException, InvalidTokenException, TooManyRequestsException } = require('../src/server/index.js');


let id = 100;
function uuidv4() { return '' + id++ };

// Increase jest timeout to 10 seconds
jest.setTimeout(120000);

const mockServer = setupServer(
    http.get('http://localhost:9999/api/v1/public/rates', ({ request }) => {
        if (request.headers.get('x-api-key') !== 'TEST_API_KEY') {
            return HttpResponse.json({}, { status: 401 });
        }
        // Return the full SIMULATED_CARGOFIVE_RESPONSE structure with offers.rates
        return HttpResponse.json(SIMULATED_CARGOFIVE_RESPONSE);
    }),
    http.get('http://localhost:9999/api/v1/public/contracts/rates', ({ request }) => {
        if (request.headers.get('x-api-key') !== 'TEST_API_KEY') {
            return HttpResponse.json({}, { status: 401 });
        }
        return HttpResponse.json(SIMULATED_CARGOFIVE_RESPONSE);
    })
);

beforeAll(() => mockServer.listen())
afterEach(() => mockServer.resetHandlers())
afterAll(() => mockServer.close())

test('[Constructor] Throws error on bad configuration, success on good parameters', () => {
    expect(() => new CargofiveServer()).toThrow(ConfigurationErrorException);
    expect(() => new CargofiveServer({ })).toThrow(ConfigurationErrorException);
    expect(() => new CargofiveServer({ apiKey: null })).toThrow(ConfigurationErrorException);
    expect(() => new CargofiveServer({ apiKey: 'test' })).not.toThrow(ConfigurationErrorException);
});

test('[Task] Main task returns exception if invalid token', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'INVALID_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    await expect(run(server)).rejects.toBeInstanceOf(InvalidTokenException);
});

async function run(server, options = {}) {
    const defaultOptions = {
        sourcePort: { id: 'USNYC', cargofivePlaceId: '123' },
        destinationPort: { id: 'GBLON', cargofivePlaceId: '456' },
        products: [{ type: '20\' Dry', quantity: 1, dangerous: false }],
        dateBegin: new Date('2024-01-01').getTime(),
        dateEnd: new Date('2024-02-01').getTime(),
    };
    return server.run({ ...defaultOptions, ...options });
}

test('[Task] Full successful loop - returns rates in correct format', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const sourcePort = {
        text: "Haifa, ILHFA",
        countryCode: "IL",
        type: "port",
        id: "ILHFA",
        city: "Haifa",
        externalIds: {
            cargofiveId: "296",
            cargofiveUuid: "2128d800-421d-4f93-8d3f-cd44e82105e5",
            code: "ILHFA"
        }
    };
    
    const destinationPort = {
        text: "Lisbon, PTLIS",
        countryCode: "PT",
        type: "port",
        id: "PTLIS",
        city: "Lisbon",
        externalIds: {
            cargofiveId: "580",
            cargofiveUuid: "357a8a7f-b378-4b99-a288-e98676311e30",
            code: "PTLIS"
        }
    };
    
    const products = [{
        id: "aaf929f3-ec28-4ef6-ab6c-ef0b941a5f57",
        type: "20' Dry",
        dangerous: false,
        quantity: 1
    }];
    
    const dateBegin = new Date('2026-02-01').getTime();
    const dateEnd = new Date('2026-03-01').getTime();
    
    const result = await run(server, { sourcePort, destinationPort, products, dateBegin, dateEnd });
    
    // Verify result is an array
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Verify each rate has required structure
    result.forEach(rate => {
        expect(rate).toHaveProperty('id');
        expect(rate).toHaveProperty('type');
        expect(rate).toHaveProperty('transportationMethod');
        expect(rate.transportationMethod).toBe('sea');
        expect(rate).toHaveProperty('source');
        expect(rate).toHaveProperty('destination');
        expect(rate).toHaveProperty('supplier');
        expect(rate).toHaveProperty('product');
        expect(rate).toHaveProperty('offer');
        expect(rate.offer).toHaveProperty('sections');
        expect(Array.isArray(rate.offer.sections)).toBe(true);
        
        // Verify source and destination match input
        expect(rate.source.id).toBe(sourcePort.id);
        expect(rate.destination.id).toBe(destinationPort.id);
        
        // Verify product matches input
        expect(rate.product.type).toBe(products[0].type);
        expect(rate.product.quantity).toBe(products[0].quantity);
    });
});

test('[Task] Returns empty array when no rates found', async () => {
    // Override the handler for this test to return empty rates
    mockServer.use(
        http.get('http://localhost:9999/api/v1/public/rates', ({ request }) => {
            if (request.headers.get('x-api-key') !== 'TEST_API_KEY') {
                return HttpResponse.json({}, { status: 401 });
            }
            return HttpResponse.json({ offers: { rates: [] } });
        })
    );
    
    const cargofiveServer = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const result = await run(cargofiveServer);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
});

test('[Task] Handles multiple products correctly', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const products = [
        { type: "20' Dry", quantity: 2, dangerous: false },
        { type: "40' Dry", quantity: 1, dangerous: false }
    ];
    
    const result = await run(server, { products });
    
    // Should return rates for each product
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Verify products are correctly mapped
    const productTypes = result.map(r => r.product.type);
    expect(productTypes).toContain("20' Dry");
    expect(productTypes).toContain("40' Dry");
});

test('[Task] Handles different product types', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const products = [
        { type: "40' High Cube", quantity: 1, dangerous: false },
        { type: "40' Refrigerated", quantity: 1, dangerous: false }
    ];
    
    const result = await run(server, { products });
    
    expect(Array.isArray(result)).toBe(true);
    result.forEach(rate => {
        expect(['40\' High Cube', '40\' Refrigerated']).toContain(rate.product.type);
    });
});

test('[Task] Handles dangerous goods flag', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const products = [
        { type: "20' Dry", quantity: 1, dangerous: true }
    ];
    
    const result = await run(server, { products });
    
    expect(Array.isArray(result)).toBe(true);
    result.forEach(rate => {
        expect(rate.product.dangerous).toBe(true);
    });
});

test('[Task] Throws TooManyRequestsException on 429 status', async () => {
    // Override handler to return 429
    mockServer.use(
        http.get('http://localhost:9999/api/v1/public/rates', () => {
            return HttpResponse.json({}, { status: 429 });
        })
    );
    
    const cargofiveServer = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    await expect(run(cargofiveServer)).rejects.toBeInstanceOf(TooManyRequestsException);
});

test('[Task] Handles network errors gracefully', async () => {
    // Override handler to simulate network error
    mockServer.use(
        http.get('http://localhost:9999/api/v1/public/rates', () => {
            return HttpResponse.error();
        })
    );
    
    const cargofiveServer = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    await expect(run(cargofiveServer)).rejects.toThrow();
});

test('[Task] Uses externalIds.cargofiveId when available', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const sourcePort = {
        id: 'ILHFA',
        externalIds: {
            cargofiveId: '296'
        }
    };
    
    const destinationPort = {
        id: 'PTLIS',
        externalIds: {
            cargofiveId: '580'
        }
    };
    
    const result = await run(server, { sourcePort, destinationPort });
    
    // Should successfully use cargofiveId from externalIds
    expect(Array.isArray(result)).toBe(true);
});

test('[Task] Falls back to port id when cargofiveId not available', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const sourcePort = {
        id: '296' // Should use this when externalIds.cargofiveId is missing
    };
    
    const destinationPort = {
        id: '580'
    };
    
    const result = await run(server, { sourcePort, destinationPort });
    
    // Should successfully fall back to id
    expect(Array.isArray(result)).toBe(true);
});

test('[Task] Rate structure includes all required sections', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const result = await run(server);
    
    expect(result.length).toBeGreaterThan(0);
    
    result.forEach(rate => {
        const sections = rate.offer.sections;
        const sectionTitles = sections.map(s => s.title);
        
        // Should have Freight, Origin, and Destination sections
        expect(sectionTitles).toContain('Freight');
        expect(sectionTitles).toContain('Origin');
        expect(sectionTitles).toContain('Destination');
        
        // Each section should have offers with fields
        sections.forEach(section => {
            expect(section).toHaveProperty('offers');
            expect(Array.isArray(section.offers)).toBe(true);
            expect(section.offers.length).toBeGreaterThan(0);
            section.offers.forEach(offer => {
                expect(offer).toHaveProperty('fields');
                expect(Array.isArray(offer.fields)).toBe(true);
            });
        });
    });
});

test('[Task] Rate includes valid supplier information', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const result = await run(server);
    
    expect(result.length).toBeGreaterThan(0);
    
    result.forEach(rate => {
        expect(rate.supplier).toHaveProperty('organization');
        expect(rate.supplier).toHaveProperty('uniqueId');
        expect(typeof rate.supplier.organization).toBe('string');
        expect(rate.supplier.organization.length).toBeGreaterThan(0);
    });
});

test('[Task] Rate includes valid offer dates and transit information', async () => {
    const server = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false 
    });
    
    const result = await run(server);
    
    expect(result.length).toBeGreaterThan(0);
    
    result.forEach(rate => {
        const offer = rate.offer;
        
        // Should have transitDates array
        expect(offer).toHaveProperty('transitDates');
        expect(Array.isArray(offer.transitDates)).toBe(true);
        
        // Should have availability
        expect(offer).toHaveProperty('availability');
        expect(typeof offer.availability.available).toBe('boolean');
    });
});

test('[Task] Response matches EXPECTED_RESULT structure and values', async () => {
    const cargofiveServer = new CargofiveServer({ 
        apiKey: 'TEST_API_KEY',
        serverUri: 'http://localhost:9999/api',
        verbose: false,
        uuidv4: uuidv4,
        now: () => new Date('2026-01-01 12:00').getTime(),
    });
    
    const sourcePort = {
        text: "Haifa, ILHFA",
        countryCode: "IL",
        type: "port",
        id: "ILHFA",
        city: "Haifa",
        externalIds: {
            cargofiveId: "296",
            cargofiveUuid: "2128d800-421d-4f93-8d3f-cd44e82105e5",
            code: "ILHFA"
        }
    };
    
    const destinationPort = {
        text: "Lisbon, PTLIS",
        countryCode: "PT",
        type: "port",
        id: "PTLIS",
        city: "Lisbon",
        externalIds: {
            cargofiveId: "580",
            cargofiveUuid: "357a8a7f-b378-4b99-a288-e98676311e30",
            code: "PTLIS"
        }
    };
    
    const products = [{
        id: "aaf929f3-ec28-4ef6-ab6c-ef0b941a5f57",
        type: "20' Dry",
        dangerous: false,
        quantity: 1
    }];
    
    const dateBegin = new Date('2026-02-01').getTime();
    const dateEnd = new Date('2026-03-01').getTime();
    
    const result = await run(cargofiveServer, { sourcePort, destinationPort, products, dateBegin, dateEnd });

    fs.writeFileSync('/tmp/result.json', JSON.stringify(result, null, 2));
    
    // Verify result length matches expected
    expect(result.length).toBe(EXPECTED_RESULT.length);

    const recursiveCompare = (actual, expected, path) => {
        expect(typeof actual).toBe(typeof expected, `Type at ${path} does not match expected`);
        if (_.isArray(actual)) {
            expect(actual.length).toBe(expected.length, `Array at ${path} has different length`);
            actual.forEach((item, index) => {
                recursiveCompare(item, expected[index], `${path}[${index}]`);
            });
        } else if (_.isObject(actual)) {
            expect(_.keys(actual).length).toBe(_.keys(expected).length, `Object at ${path} has different number of keys`);
            _.keys(actual).forEach((key) => {
                recursiveCompare(actual[key], expected[key], `${path}.${key}`);
            });
        } else {
            expect(actual).toEqual(expected, `Value at ${path} does not match expected`);
        }
    }

    recursiveCompare(result, EXPECTED_RESULT);
});