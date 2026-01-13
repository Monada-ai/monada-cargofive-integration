import React, { useState, useRef } from 'react';

// MUI imports
import Box from '@mui/material/Box';
import { grey, blue } from '@mui/material/colors';
import Switch from '@mui/material/Switch';

// Font Awesome import
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGripDotsVertical } from '@fortawesome/pro-solid-svg-icons';

// Generic imports
import _ from 'lodash';
import { useDrag } from 'react-dnd'
import CurrencyList from 'currency-list';

function DetailsCard(props) {
    const { rate, toggleFavorite, isFavorite, emphasize, setEmphasize, routeIndex = 0, departIndex = 0, onStartDragging, onEndDragging } = props;
    const [ expandText, setExpandText ] = useState(false);

    const attributes = _.get(rate, 'attributes.cargofiveContract');
    const contract = attributes;
    const charges = _.get(rate, 'attributes.cargofiveCharges', []);

    return (
        <Box>
            {rate.offer.sections.map(section => (
                <SectionDetails
                    key={`${section.title}-${section.id}`}
                    section={section}
                    rate={rate}
                    emphasize={emphasize}
                    setEmphasize={setEmphasize}
                    onStartDragging={onStartDragging}
                    onEndDragging={onEndDragging}
                />
            ))}
            <Box sx={{ width: '100%', paddingBottom: '20px', borderTop: '1px solid #D9D9D9' }} />
            <Box sx={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                {contract && (
                    <>
                        {contract.validFrom && <><b>Valid from:</b> {new Date(contract.validFrom).toLocaleDateString('en-GB')}</>}
                        {contract.validFrom && contract.validUntil ? ' · ' : ''}
                        {contract.validUntil && <><b>Valid until:</b> {new Date(contract.validUntil).toLocaleDateString('en-GB')}</>}
                        {contract.validUntil ? ' · ' : ''}
                    </>
                )}
                {contract?.remarks && <><b>Remarks:</b> {contract.remarks}</>}
            </Box>
        </Box>
    )
}

function CargofiveSingleFieldDetails(props) {
    const { rate, field, value, emphasize, setEmphasize, onStartDragging, onEndDragging } = props;

    const [, drag] = useDrag(() => ({
        type: 'RateCardSingleRate',
        item: () => {
            onStartDragging();
            return { rate, field };
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        }),
        end: () => {
            onEndDragging();
        }
    }))

    if ((field.type !== 'per-unit') && (field.type !== 'per-unit-type') && (field.type !== 'flat') && (field.type !== 'custom')) return null;

    return (
        <Box
            sx={{ 
                cursor: 'move', 
                padding: '10px',
                width: '100%', 
                minWidth: '100%', 
                marginBottom: '12px',
                border: '1px solid #E0E0E0'
            }}
        >
            <Box
                ref={drag} 
                sx={{ 
                    background: 'white',
                    padding: '10px',
                    cursor: 'move', 
                    fontWeight: emphasize ? '800' : '400', 
                    display: 'flex', 
                    alignItems: 'center',
                    width: '100%', 
                    minWidth: '100%', 
                }}
            >
                <Box sx={{ fontWeight: emphasize ? '800' : '400', fontSize: '18px' }}>
                    <FontAwesomeIcon icon={faGripDotsVertical} />
                </Box>
                <Box sx={{ padding: '0px 22px' }}>
                |
                </Box>
                <Box sx={{ fontSize: '10px', fontWeight: emphasize ? '800' : '400' }}>
                    {rate.product.type}
                </Box>
                <Box sx={{ padding: '0px 22px' }}>
                |
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Box sx={{ fontSize: '12px', fontWeight: emphasize ? '800' : '400', marginBottom: '6px' }}>
                        {CurrencyList.get(value.currency)?.symbol || value.currency}{value.value.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        {field.type === 'per-unit' || field.type === 'per-unit-type' ? ' / product' : ''}
                        {field.type === 'flat' ? ' / shipment' : ''}
                        {field.type === 'custom' ? ` / ${field.multiplierText}` : ''}
                    </Box>
                    <Box sx={{ fontSize: '12px', color: grey[600] }}>
                        {field.title}
                    </Box>
                </Box>
                {setEmphasize && (
                    <Switch checked={emphasize} onChange={() => setEmphasize(!emphasize)} />
                )}
            </Box>
        </Box>
    )
}

export default DetailsCard;

function SectionDetails(props) {
    const { section, rate, onStartDragging, onEndDragging, emphasize, setEmphasize } = props;

    const _rate = useRef(rate);
    _rate.current = rate;

    const [, drag] = useDrag(() => ({
        type: 'RateCardSingleSection',
        item: () => {
            onStartDragging();
            const noZeroFieldsRate = _.cloneDeep(_rate.current);
            noZeroFieldsRate.offer.sections = noZeroFieldsRate.offer.sections.map(section => {
                section.offers = section.offers.map(offer => {
                    offer.fields = offer.fields.filter(f => {
                        if (f.type === 'flat') {
                            return !!f.values.flat.value || !!f.values.flat.formula;
                        } if (f.type === 'string') {
                            return !!f.values.string.value;
                        } else {
                            return f.values[rate.product.id].value || f.values[rate.product.id].formula;
                        }
                        return f;
                    })
                    return offer;
                })
                return section;
            });

            return { rate: noZeroFieldsRate, section };
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        }),
        end: () => {
            onEndDragging();
        }
    }))

    return (
        <Box key={section.title} sx={{ marginBottom: '20px', background: 'white', padding: '12px' }} ref={drag}>
            <Box sx={{ fontWeight: 400, fontSize: '13px', textTransform: 'uppercase', marginBottom: '32px', display: 'flex', alignItems: 'center', cursor: 'move' }}>
                <Box sx={{ fontSize: '18px', marginRight: '12px' }}>
                    <FontAwesomeIcon icon={faGripDotsVertical} />
                </Box>
                <Box>
                    {section.title}
                </Box>
            </Box>
            <Box sx={{ display: 'flex', marginTop: '12px', flexWrap: 'wrap' }}>
                {section.offers[0].fields.map(field => {
                    const value = _.values(field.values)[0];
                    return (
                        <CargofiveSingleFieldDetails
                            key={field.id}
                            rate={rate}
                            field={field}
                            value={value}
                            emphasize={!!(emphasize || []).find(e => e.rateId === rate.id && e.fieldId === field.id)}
                            setEmphasize={!setEmphasize ? null : emphasized => {
                                const newEmphasize = _.cloneDeep(emphasize || []);
                                if (emphasized) {
                                    newEmphasize.push({ rateId: rate.id, fieldId: field.id });
                                } else {
                                    newEmphasize.splice(newEmphasize.findIndex(e => e.rateId === rate.id && e.fieldId === field.id), 1);
                                }
                                setEmphasize(_.uniqWith(newEmphasize, _.isEqual));
                            }}
                            onStartDragging={onStartDragging}
                            onEndDragging={onEndDragging}
                        />
                    )
                })}
            </Box>
        </Box>
    );
}
