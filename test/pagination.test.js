// Standalone pagination coverage (mocks axios directly, no msw — runs even while the
// msw-based server.test.js is broken on ESM deps). Verifies the rate search walks every
// page CargoFive reports via total_pages instead of silently returning only page 1.
jest.mock('axios');
const axios = require('axios');
const { Server } = require('../src/server/server.js');

const baseArgs = {
    sourcePort: { id: 'A' }, destinationPort: { id: 'B' },
    products: [{ type: "20' Dry", quantity: 1 }],
    dateBegin: Date.now(), dateEnd: Date.now(),
};

test('walks every page reported by total_pages', async () => {
    const pages = [];
    axios.get.mockImplementation(async (url) => {
        pages.push(Number(new URL(url).searchParams.get('page')));
        return { data: { offers: { rates: [] }, total_pages: 3, total_records: 60 } };
    });
    await new Server({ apiKey: 'k', serverUri: 'http://x/api' }).run(baseArgs);
    expect(pages).toEqual([1, 2, 3]);
    expect(axios.get).toHaveBeenCalledTimes(3);
});

test('makes a single request when no total_pages is returned (no regression)', async () => {
    const pages = [];
    axios.get.mockImplementation(async (url) => {
        pages.push(Number(new URL(url).searchParams.get('page')));
        return { data: { offers: { rates: [] } } };
    });
    await new Server({ apiKey: 'k', serverUri: 'http://x/api' }).run(baseArgs);
    expect(pages).toEqual([1]);
});
