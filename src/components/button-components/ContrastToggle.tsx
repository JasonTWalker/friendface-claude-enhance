import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel'
import { useAppSelector } from '../../app/hooks';
const ContrastToggle = ( { label, onChange } : { label: string; onChange: () => void }) => {
  
  const theme = useAppSelector(state => state.theme.value);
  const isChecked = theme === "dark" ? true : false;


  // get hook into state of theme to determine if the switch should be checked or not


  return (
            <FormControlLabel control={<Switch checked={isChecked} />} label={label} onChange={onChange} />
);};
export default ContrastToggle;