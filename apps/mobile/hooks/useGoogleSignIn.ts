import { useEffect, useMemo } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { signInWithGoogleCredential } from '../lib/firebase/auth';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function useGoogleSignIn(onSuccess: () => void, onError: (msg: string) => void) {
  const appUrl = Linking.createURL('/');
  const redirectUri = `https://auth.expo.io/@momaksoud/mobile?appRedirectUrl=${encodeURIComponent(appUrl)}`;
  const nonce = useMemo(() =>
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
  []);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
      extraParams: { nonce },
    },
    GOOGLE_DISCOVERY
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (!idToken) {
        onError('Google sign-in did not return an ID token.');
        return;
      }
      signInWithGoogleCredential(idToken).then(({ user, error }) => {
        if (error || !user) {
          onError(error ?? 'Google sign-in failed.');
        } else {
          onSuccess();
        }
      });
    } else if (response?.type === 'error') {
      onError(response.error?.message ?? 'Google sign-in was cancelled or failed.');
    }
  }, [response]);

  return { promptAsync, disabled: !request };
}
