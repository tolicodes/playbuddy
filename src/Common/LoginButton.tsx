import { User } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import GoogleButton from 'react-google-button';

const LoginButton: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();

      setUser(data.user);
      setLoading(false);
    };

    fetchUser();
  }, []);

  if (loading) return <span></span>;

  return user ? (
    <div>
      <img
        style={{ height: 30, borderRadius: 15 }}
        src={user.user_metadata.avatar_url}
        alt="user avatar"
      />
      <span>{user.user_metadata.full_name}</span>
    </div>
  ) : (
    <GoogleButton onClick={signUpUser}>Sign Up</GoogleButton>
  );
};

export default LoginButton;
