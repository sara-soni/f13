import "./App.css";
import { useEffect } from "react";
import { AppRouter } from "./app/router";
import { useAppDispatch } from "./app/hooks";
import { checkAuthSession } from "./features/auth/authSlice";

export default function App() {
  const dispatch = useAppDispatch();

  // Validate server-managed session on initial application bootstrap
  useEffect(() => {
    void dispatch(checkAuthSession());
  }, [dispatch]);

  return <AppRouter />;
}
