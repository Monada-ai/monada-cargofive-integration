# monada-cargofive-integration

Integration components to connect CargoFive into the Monada application.

This package provides both server-side and client-side components for integrating CargoFive's shipping rate API into Monada, enabling users to search for ocean freight rates, view carrier information, and manage CargoFive settings.

## Features

- **Rate Search**: Search for ocean freight rates between ports using CargoFive API
- **Multiple Container Types**: Support for various container types (20' Dry, 40' Dry, 40' High Cube, 40' Refrigerated, etc.)
- **Comprehensive Rate Details**: Includes freight, origin, and destination charges
- **Carrier Information**: Displays carrier logos, names, and unique identifiers
- **Transit Information**: Provides transit times and dates
- **Settings Management**: Configurable API key and feature toggles

## Installation

```bash
npm install @monada-ai/monada-cargofive-integration
```

## Configuration

### Server Configuration

The server requires an API key to authenticate with CargoFive:

```javascript
const { Server } = require('@monada-ai/monada-cargofive-integration');

const cargofiveServer = new Server({
    apiKey: 'your-api-key-here',
    serverUri: 'https://coreapp.cargofive.com/api', // Optional, defaults to production
    verbose: false // Optional, enables debug logging
});
```

### Client Settings Component

The Settings component accepts the following props:

- `enabled` (boolean): Whether the CargoFive integration is enabled
- `setEnabled` (function): Callback to toggle the integration
- `apiKey` (string): CargoFive API key
- `setApiKey` (function): Callback to update the API key
- `useCargofiveForRates` (boolean): Enable CargoFive for locations and supplier pricing searches
- `setUseCargofiveForRates` (function): Callback to toggle this feature

## Usage

### Server-Side Rate Search

```javascript
const rates = await cargofiveServer.run({
    sourcePort: {
        id: 'ILHFA',
        externalIds: {
            cargofiveId: '296'
        }
    },
    destinationPort: {
        id: 'PTLIS',
        externalIds: {
            cargofiveId: '580'
        }
    },
    products: [{
        type: "20' Dry",
        quantity: 1,
        dangerous: false
    }],
    dateBegin: new Date('2026-02-01').getTime(),
    dateEnd: new Date('2026-03-01').getTime()
});
```

### Response Format

The server returns an array of rate objects with the following structure:

```javascript
{
    id: "cargofive-{rate-uuid}",
    type: "spot" | "contract",
    created: timestamp,
    transportationMethod: "sea",
    source: { /* port object */ },
    destination: { /* port object */ },
    supplier: {
        organization: "Carrier Name",
        uniqueId: "Carrier Code",
        logo: "https://..."
    },
    product: {
        id: "product-uuid",
        type: "20' Dry",
        quantity: 1,
        dangerous: false
    },
    offer: {
        validFrom: date | null,
        validUntil: date | null,
        transitTime: string | null,
        transitDates: [{
            etd: "2026-02-02",
            eta: "2026-02-23"
        }],
        availability: {
            available: true,
            count: null
        },
        transshipment: "",
        sections: [
            {
                id: "section-uuid",
                title: "Freight" | "Origin" | "Destination",
                offers: [{
                    id: "offer-uuid",
                    fields: [{
                        id: "field-uuid",
                        title: "Charge Name",
                        type: "per-unit-type" | "flat",
                        values: {
                            "product-uuid": {
                                value: 302,
                                currency: "USD"
                            }
                        }
                    }]
                }]
            }
        ]
    },
    attributes: {
        cargofiveRate: { /* full CargoFive rate object */ }
    },
    notes: ""
}
```

## Error Handling

The server throws the following exceptions:

- `ConfigurationErrorException`: Thrown when API key or server URI is missing
- `InvalidTokenException`: Thrown when API key is invalid (401/403 responses)
- `TooManyRequestsException`: Thrown when rate limit is exceeded (429 responses)

## Testing

Server code can be tested using:

```bash
npm test
```

The test suite includes:
- Configuration validation tests
- Rate search tests
- Error handling tests
- Full integration tests comparing against expected results

## Development

### Running Storybook

To view and develop the client components:

```bash
npm run storybook
```

### Building

To build the package for distribution:

```bash
npm run build
```

## API Endpoints

The integration uses the following CargoFive API endpoints:

- `GET /v1/public/rates`: Search for rates between ports

## Port Configuration

Ports should include `externalIds.cargofiveId` for optimal matching. If not available, the integration falls back to using the port `id`.

## License

ISC

## Author

Yoav Amit
