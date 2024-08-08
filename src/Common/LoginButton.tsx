import { useEffect } from 'react';
import { supabase } from './supabaseClient';
import GoogleButton from 'react-google-button';
import { useGetUser } from '../User/hooks/useGetUser';
import { Button } from '@mui/material';

const LoginButton: React.FC = () => {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      } else {
        localStorage.removeItem('supabase.auth.token');
      }
    });

    const savedSession = localStorage.getItem('supabase.auth.token');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
  }, []);

  const signUpUser = async () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.toString(),
      },
    });
  };

  const { user, isLoading } = useGetUser();

  if (isLoading) return <span>Loading</span>;

  return user ? (
    <div>
      <img
        style={{ height: 30, borderRadius: 15 }}
        src={user.user_metadata.avatar_url}
        alt="user avatar"
      />
    </div>
  ) : (
    <Button onClick={signUpUser}>
      <img style={{ width: '30px', marginRight: '5px' }} src="/google-logo.png" alt="Google logo" className="google-logo" />
      <span> Login</span>
    </Button>
  );
};

export default LoginButton;
