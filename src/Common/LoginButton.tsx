import { useEffect } from 'react';
import { supabaseClient } from './supabaseClient';
import { useGetUser } from '../User/hooks/useGetUser';
import { Button } from '@mui/material';
import { faSignIn } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const LoginButton: React.FC = () => {
  useEffect(() => {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session) {
        localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      } else {
        localStorage.removeItem('supabase.auth.token');
      }
    });

    const savedSession = localStorage.getItem('supabase.auth.token');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      supabaseClient.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
  }, []);

  const signUpUser = async () => {
    supabaseClient.auth.signInWithOAuth({
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
      <FontAwesomeIcon
        icon={faSignIn}
        size="2x"
      />
    </Button>
  );
};

export default LoginButton;
