import React, { useState, useEffect } from 'react';
import { action } from '@storybook/addon-actions';
import Settings from '../../src/client/Settings.js';

export default {
    title: 'Client/Settings',
    component: Settings,
    parameters: {
        // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
        layout: 'padded',
    },
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
    decorators: [
        (Story, context) => {
            const [enabled, setEnabled] = useState(context.args.enabled ?? true);
            const [apiKey, setApiKey] = useState(context.args.apiKey ?? 'test-api-key-12345');
            const [useCargofiveForRates, setUseCargofiveForRates] = useState(context.args.useCargofiveForRates ?? false);

            // Sync state with args when they change
            useEffect(() => {
                if (context.args.enabled !== undefined) {
                    setEnabled(context.args.enabled);
                }
            }, [context.args.enabled]);

            useEffect(() => {
                if (context.args.apiKey !== undefined) {
                    setApiKey(context.args.apiKey);
                }
            }, [context.args.apiKey]);

            useEffect(() => {
                if (context.args.useCargofiveForRates !== undefined) {
                    setUseCargofiveForRates(context.args.useCargofiveForRates);
                }
            }, [context.args.useCargofiveForRates]);

            return (
                <Story
                    args={{
                        ...context.args,
                        enabled,
                        setEnabled: (value) => {
                            setEnabled(value);
                            action('setEnabled')(value);
                        },
                        apiKey,
                        setApiKey: (value) => {
                            setApiKey(value);
                            action('setApiKey')(value);
                        },
                        useCargofiveForRates,
                        setUseCargofiveForRates: (value) => {
                            setUseCargofiveForRates(value);
                            action('setUseCargofiveForRates')(value);
                        },
                    }}
                />
            );
        }
    ],
    argTypes: {
        enabled: {
            control: 'boolean',
            description: 'Whether the CargoFive integration is enabled',
        },
        apiKey: {
            control: 'text',
            description: 'CargoFive API key',
        },
        useCargofiveForRates: {
            control: 'boolean',
            description: 'Use CargoFive for locations and supplier pricing searches',
        },
        setEnabled: { action: 'setEnabled' },
        setApiKey: { action: 'setApiKey' },
        setUseCargofiveForRates: { action: 'setUseCargofiveForRates' },
    }
};

export const Primary = {
    name: 'Primary',
    args: {
        enabled: true,
        apiKey: 'test-api-key-12345',
        useCargofiveForRates: false,
    }
}
