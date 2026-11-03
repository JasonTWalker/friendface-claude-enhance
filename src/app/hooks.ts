import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

// use throughout application instead of plain 'useDispatch' and 'useSelector' i.e. import these from here
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
