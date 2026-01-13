// Generic imports
import _ from 'lodash';

// MUI imports
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

function Settings(props) {
    const { enabled, setEnabled, apiKey, setApiKey, useCargofiveForRates, setUseCargofiveForRates } = props;

    return (
        <Paper sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', p: 1 }}>
                {enabled && <Chip label='Active' color='chip-sent-to-endcustomer' sx={{ mr: 2 }} />}
                {!enabled && <Chip label='Inactive' sx={{ mr: 2 }} />}
                <Typography variant='h6' sx={{ textDecoration: 'none', fontWeight: 700, flex: 1 }}>
                    CargoFive
                </Typography>
                <Switch checked={enabled} onChange={() => setEnabled(!enabled)} />
            </Box>
            {enabled && (
                <Box sx={{ borderTop: '1px solid #eee', p: 3, display: 'flex', flexDirection: 'column' }}>
                    <TextField
                        label='API Key'
                        variant='outlined'
                        value={apiKey || ''}
                        onChange={(e) => {
                            setApiKey(e.target.value);
                        }}
                        sx={{ mb: 2 }}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={useCargofiveForRates || false}
                                onChange={(e) => {
                                    setUseCargofiveForRates(e.target.checked);
                                }}
                            />
                        }
                        label='Use CargoFive for locations and supplier pricing'
                    />
                </Box>
            )}
        </Paper>
    )
}

export default Settings;
