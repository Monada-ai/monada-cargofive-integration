const _ = require('lodash');
const axios = require('axios');
const _uuidv4 = require('uuid').v4;
const { productToIso, basisIsPerBL, productFromIso } = require('../utils/utils.js');

const DEMO_ORG_ID = '251f5e5d-e272-47e8-beb2-d905c9d05546';

function ConfigurationErrorException() {}
function InvalidTokenException() {}
function TooManyRequestsException() {}

function _now() {
    return new Date().getTime();
}

const PRODUCTION_URI = 'https://coreapp.cargofive.com/api';

function Server({ apiKey, serverUri = PRODUCTION_URI, uuidv4 = _uuidv4, now = _now, verbose = false } = {}) {
    if (!apiKey || !serverUri) {
        throw new ConfigurationErrorException();
    }

    const baseUrl = serverUri;

    async function run({ sourcePort, destinationPort, products, dateBegin, dateEnd }) {
        try {
            // Get source and destination place IDs from ports
            // CargoFive uses place IDs, so we need to extract the cargofivePlaceId or code
            const sourcePlaceId = sourcePort.externalIds?.cargofiveId || sourcePort.id;
            const destPlaceId = destinationPort.externalIds?.cargofiveId || destinationPort.id;

            if (verbose) {
                console.log('[CargoFive] Searching rates:', { sourcePlaceId, destPlaceId, dateBegin, dateEnd });
            }

            // Search for rates matching origin and destination
            // Note: CargoFive API may need to be called differently - this is a placeholder
            // The actual API endpoint structure may vary
            let rates = [];
            
            try {
                const params = {
                    providers: -1,
                    api_providers: -1,
                    origins: sourcePlaceId,
                    destinations: destPlaceId,
                    type: 'FCL',
                    include_destination_charges: true,
                    include_origin_charges: true,
                    include_imo_charges: false,
                    cargo_details: products.map(p => productToCargoDetails({ product: p })).join(','),
                    departure_date: new Date(dateBegin).toISOString().split('T')[0],
                }

                if (verbose) {
                    console.log('[CargoFive] Rates request:', `${baseUrl}/v1/public/rates?${new URLSearchParams(params).toString()}`);
                }

                // Try to search rates by origin/destination
                const { data: ratesResponse } = await axios.get(
                    `${baseUrl}/v1/public/rates?${new URLSearchParams(params).toString()}`,
                    { 
                        headers: { 'x-api-key': apiKey },
                    }
                );

                if (verbose) {
                    console.log('[CargoFive] Rates response:', JSON.stringify(ratesResponse.data, null, 2));
                }
                
                rates = ratesResponse?.offers?.rates || [];
            } catch (e) {
                throw e;
            }

            const ret = rates.map(rate => convertCargofiveRateToMonadaRate({ rate, sourcePort, destinationPort, products, dateBegin, dateEnd, uuidv4, now })).flat();
            return ret;
        } catch (e) {
            if (e.response?.status === 429) {
                throw new TooManyRequestsException();
            } else if (e.response?.status === 401 || e.response?.status === 403) {
                throw new InvalidTokenException();
            } else {
                throw e;
            }
        }
    }

    this.run = run;
}

/**
 * Convert CargoFive charges to Monada rate format
 * This is a simplified version - full implementation would use cargofiveChargesToApiRates logic
 */
function convertCargofiveRateToMonadaRate({ rate, sourcePort, destinationPort, products, dateBegin, dateEnd, uuidv4, now }) {
    // 1. Flatten the Cargofive "rates" array.
    // Each rate in Cargofive will become a separate Monada entry.
    const productOffer = rate.product_offer;
    const productPrice = rate.product_price;
    const schedule = rate.schedules?.[0] || {};

    return products.map(monadaProduct => {

        // Generate a productId for the per-unit mapping logic
        const productId = uuidv4();

        // 2. Map Charges (Freight, Origin, Destination) into Monada Sections
        const allCharges = [
            ...(productPrice.freight?.charges || []).map(c => ({ ...c, section: 'Freight' })),
            ...(productPrice.origin?.charges || []).map(c => ({ ...c, section: 'Origin' })),
            ...(productPrice.destination?.charges || []).map(c => ({ ...c, section: 'Destination' }))
        ];

        const sections = [{
            id: uuidv4(),
            title: 'Freight',
            offers: [{
                id: uuidv4(),
                fields: []
            }]
        }, {
            id: uuidv4(),
            title: 'Origin',
            offers: [{
                id: uuidv4(),
                fields: []
            }]
        }, {
            id: uuidv4(),
            title: 'Destination',
            offers: [{
                id: uuidv4(),
                fields: []
            }]
        }];

        allCharges.forEach(charge => {
            // Determine if it's per container or a flat fee (BL, Doc fee, etc.)
            const isPerUnit = !basisIsPerBL(charge);

            const values = {};
            if (isPerUnit) {
                // Monada usually expects a map of productId/ContainerType to the specific value
                // For simplicity in this migration, we map the price of the first relevant container
                const tariff = charge.tariffs.find(t => productFromIso(t.container_iso) === monadaProduct.type) || charge.tariffs?.[0] || {};
                values[productId] = {
                    value: tariff.unit_price || 0,
                    currency: charge.unit_price_currency || 'USD'
                };
            } else {
                values['flat'] = {
                    value: charge.tariffs?.[0]?.unit_price || 0,
                    currency: charge.unit_price_currency || 'USD'
                };
            }

            sections.find(s => s.title === charge.section).offers[0].fields.push({
                id: uuidv4(),
                title: charge.charge_name,
                type: isPerUnit ? 'per-unit-type' : 'flat',
                values
            });
        });

        // 3. Construct the Monada Object
        return {
            id: `cargofive-${productOffer.rate_uuid}-${uuidv4()}`,
            type: productOffer.main_product_name?.toLowerCase().includes('spot') ? 'spot' : 'contract',
            created: now(),
            transportationMethod: 'sea',
            source: productOffer.origin_port_unlocode === sourcePort.id ? sourcePort : {
                text: productOffer.origin_port_display_name,
                id: productOffer.origin_port_unlocode,
                countryCode: productOffer.origin_port_unlocode.substring(0, 2),
            },
            destination: productOffer.destination_port_unlocode === destinationPort.id ? destinationPort : {
                text: productOffer.destination_port_display_name,
                id: productOffer.destination_port_unlocode,
                countryCode: productOffer.destination_port_unlocode.substring(0, 2),
            },
            supplier: {
                organization: productOffer.main_carrier_name,
                uniqueId: productOffer.main_carrier_code || productOffer.main_carrier_scac,
                logo: productOffer.main_carrier_logo
            },
            attributes: {
                cargofiveRate: rate,
            },
            product: {
                ...monadaProduct,
                id: productId,
            },
            offer: {
                validFrom: productPrice.valid_from || new Date(now()).toISOString().split('T')[0],
                validUntil: productPrice.valid_to || endOfMonth(new Date(now())).toISOString().split('T')[0],
                transitTime: schedule.transit_time || null,
                transitDates: [{
                    etd: schedule.departure_date?.split('T')[0],
                    eta: schedule.arrival_date?.split('T')[0]
                }],
                availability: {
                    available: productOffer.rate_status === 'Valid',
                    count: null // Cargofive example doesn't specify stock count
                },
                transshipment: productOffer.via_port?.join(', ') || '',
                sections: sections
            },
            notes: _.map(productOffer.rate_details?.additional_data, (value, key) => {
                return `${_.startCase(key)}: ${value}`;
            }).join(' • ') || ''
        };
    });
    // TODO
    /*
            return {
                id: `okargo-${offer.chargeSet.chargeSetId}-${product.type}-${uuidv4()}`,
                type: ratesPriceType === 'Contract' ? 'contract' : ratesPriceType === 'Spot' ? 'spot' : null,
                created: new Date(creationDate).getTime(),
                transportationMethod: 'sea',
                source: sourcePort,
                destination: destinationPort,
                supplier: {
                    organization: carrier.name,
                    uniqueId: carrier.code,
                },
                attributes: {
                    okargoOffer: offer,
                },
                product: {
                    ...product,
                    id: productId,
                    quantity: 1,
                },
                offer: {
                    validFrom: `${dateBegin.getFullYear()}-${dateBegin.getMonth() + 1}-${dateBegin.getDate()}`,
                    validUntil: `${quotValidity.getFullYear()}-${quotValidity.getMonth() + 1}-${quotValidity.getDate()}`,
                    transitTime,
                    transitDates: departs.filter(d => d.source !== 'SchedulesApi').map(d => ({
                        etd: d.etd.replace(/T\d\d:\d\d:\d\dZ/, ''),
                        eta: d.eta.replace(/T\d\d:\d\d:\d\dZ/, ''),
                    })),
                    availability: availability === null ? null : {
                        available: availability.status === 'Available',
                        count: availability.containerLeft || null,
                    },
                    transshipment: transShipments.map(t => t.unLocode).join(', '),
                    sections
                },
                notes: moreInfo.map(o => o.content).join(','),
            }
                */
}

function productToCargoDetails({ product }) {
    return product.quantity + 'x' + productToIso(product.type) + 'x15000'
}

function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

module.exports = { Server, ConfigurationErrorException, InvalidTokenException, TooManyRequestsException };
