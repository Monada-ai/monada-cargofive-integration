import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { withThemeFromJSXProvider } from '@storybook/addon-themes';
import { red, green, grey } from '@mui/material/colors';

const theme = createTheme({
    palette: {
        primary: {
            main: '#605dec',
        },
        'chip-request-new': {
            main: red[300],
            contrastText: '#fff',
        },
        'chip-opened-by-customer': {
            main: '#DB74FF',
            contrastText: '#fff',
        },
        'chip-won': {
            main: green[500],
            contrastText: '#fff',
        },
        'chip-lost': {
            main: red[500],
            contrastText: '#fff',
        },
        'chip-sent-to-endcustomer': {
            main: '#2185D0',
            contrastText: '#fff',
        },
        'chip-submitted': {
            main: '#AC73E5',
            contrastText: '#fff',
        },
        'supplier-filter': {
            root: {
                background: 'green',
                '& input': {
                    color: '#FFF',
                }
            }
        },
        'monada-button': {
            main: '#605DE4',
            contrastText: '#ffffff',
            dark: '#4d4ab6',
        },
        'black-button': {
            main: '#000000',
            contrastText: '#ffffff',
            dark: '#4d4ab6',
        },
        oneoffbuilderfields: {
            main: '#667085',
            contrastText: '#ffffff',
            dark: grey[500],
        }
    },
    typography: {
        fontFamily: [
            'Poppins',
            'sans-serif',
        ].join(','),
    },
});

/** @type { import('@storybook/react').Preview } */
const preview = {
    parameters: {
        actions: { argTypesRegex: "^on[A-Z].*" },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
};

export const decorators = [
    withThemeFromJSXProvider({
        themes: {
            light: theme,
        },
        defaultTheme: 'light',
        Provider: ThemeProvider,
        GlobalStyles: CssBaseline,
    })];

export default preview;
