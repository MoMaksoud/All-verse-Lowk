'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProfilePicture } from '@/components/ProfilePicture';
import { X, Trash2, Camera, ArrowLeft } from 'lucide-react';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile as updateFirebaseProfile,
  updateEmail
} from 'firebase/auth';
import { formatPhoneNumber } from '@/lib/utils';

const INPUT = 'input w-full sm:w-64';
const SECTIONS: { id: SettingsSection; name: string }[] = [
  { id: 'account', name: 'Account' },
  { id: 'security', name: 'Security' },
  { id: 'billing', name: 'Payments' },
];

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-zinc-950">{title}</h3>
        {hint && <p className="mt-0.5 text-sm text-zinc-500">{hint}</p>}
      </div>
      <div className="flex min-w-0 items-center gap-3 sm:shrink-0 sm:justify-end">{children}</div>
    </div>
  );
}

function Notice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const cls = tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800';
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ${cls}`}>{children}</p>;
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-zinc-500 hover:text-zinc-950">
            <X strokeWidth={1.75} className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

const DANGER_BUTTON = 'inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-50';

type SettingsSection = 'account' | 'security' | 'billing';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const { currentUser, loading: authLoading, logout, refreshProfile, userProfile, userProfilePic } = useAuth();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  // Account Management states
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Email re-auth modal state
  const [showEmailReauthModal, setShowEmailReauthModal] = useState(false);
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [emailReauthPassword, setEmailReauthPassword] = useState('');
  const [emailReauthError, setEmailReauthError] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/signin');
      return;
    }
    if (currentUser?.uid) {
      fetchProfile();
    }
  }, [currentUser, authLoading]);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet('/api/profile');
      
      if (response.status === 404) {
        setProfile(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      if (result.success) {
        setProfile(result.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    // Format phone number if it's being edited
    const value = field === 'phoneNumber' && currentValue 
      ? formatPhoneNumber(currentValue) 
      : currentValue || '';
    setEditValues({ [field]: value });
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValues({});
    setError('');
    setSuccess('');
  };

  const handleSaveField = async (field: string) => {
    if (!currentUser?.uid) {
      setError('You must be logged in');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const value = editValues[field]?.trim();
      
      if (field === 'username') {
        // Check username availability first
        const { apiGet } = await import('@/lib/api-client');
        const checkResponse = await apiGet(`/api/users/check-username?username=${encodeURIComponent(value)}`);
        const checkData = await checkResponse.json();
        
        if (!checkData.available) {
          setError('This username is already taken. Please choose another one.');
          return;
        }
        
        // Update Firestore profile
        const { apiPut } = await import('@/lib/api-client');
        await apiPut('/api/profile', { username: value });
        setSuccess('Username updated successfully');
      } else if (field === 'displayName') {
        // Update Firebase Auth profile
        await updateFirebaseProfile(currentUser, {
          displayName: value
        });
        // Update Firestore profile
        const { apiPut } = await import('@/lib/api-client');
        await apiPut('/api/profile', { displayName: value });
        setSuccess('Display name updated successfully');
      } else if (field === 'email') {
        if (!value || !value.includes('@')) {
          setError('Please enter a valid email address');
          return;
        }
        // Open re-auth modal instead of prompt()
        setPendingNewEmail(value);
        setShowEmailReauthModal(true);
        setSaving(false);
        return;
      } else if (field === 'phoneNumber') {
        const { apiPut } = await import('@/lib/api-client');
        await apiPut('/api/profile', { phoneNumber: value });
        setSuccess('Phone number updated successfully');
      }

      await fetchProfile();
      setEditingField(null);
      setEditValues({});
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating field:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use');
      } else {
        setError(error?.message || 'Failed to update. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.uid) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const form = new FormData();
      form.append('photo', file);
      const { apiRequest } = await import('@/lib/api-client');
      const resp = await apiRequest('/api/upload/profile-photo', {
        method: 'POST',
        headers: {
          'x-user-email': currentUser.email || ''
        },
        body: form,
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      const data = await resp.json();
      
      // Use storage path as the source of truth (photoPath takes precedence over photoUrl)
      const profilePicturePath = data.photoPath || data.photoUrl;
      
      setProfile((p: any) => p ? { ...p, profilePicture: profilePicturePath } : p);
      
      // Refresh profile from AuthContext to update global state
      await refreshProfile();
      
      setSuccess('Profile picture updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Profile photo upload failed:', err);
      const errorMessage = err?.message || 'Failed to upload photo';
      setError(errorMessage);
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasswordChange = async () => {
    if (!currentUser?.email) {
      setPasswordError('User email not found');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordError('');

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, passwordData.newPassword);

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordModal(false);
      setSuccess('Password changed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('New password is too weak');
      } else {
        setPasswordError(error?.message || 'Failed to change password');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    if (!currentUser?.email || !pendingNewEmail) return;
    if (!emailReauthPassword) {
      setEmailReauthError('Password is required');
      return;
    }
    try {
      setChangingEmail(true);
      setEmailReauthError('');
      const credential = EmailAuthProvider.credential(currentUser.email, emailReauthPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updateEmail(currentUser, pendingNewEmail);
      setShowEmailReauthModal(false);
      setEmailReauthPassword('');
      setPendingNewEmail('');
      setEditingField(null);
      setEditValues({});
      setSuccess('Email updated successfully. Please verify your new email.');
      setTimeout(() => setSuccess(''), 4000);
      await fetchProfile();
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setEmailReauthError('Incorrect password');
      } else {
        setEmailReauthError(err?.message || 'Failed to update email');
      }
    } finally {
      setChangingEmail(false);
    }
  };

  const editor = (field: string, input: React.ReactNode) => (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {input}
      <button type="button" onClick={() => handleSaveField(field)} disabled={saving} className="btn btn-primary px-3 py-2 text-sm">
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={handleCancelEdit} disabled={saving} className="btn btn-ghost px-3 py-2 text-sm">
        Cancel
      </button>
    </div>
  );

  const editButton = (field: string, value: string) => (
    <button
      type="button"
      onClick={() => handleEditField(field, value)}
      className="text-sm font-medium text-primary-600 hover:text-primary-700"
    >
      Edit
    </button>
  );

  const renderAccount = () => (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Account</h2>
      <p className="mt-1 text-sm text-zinc-600">How you appear and how we reach you.</p>

      {error && <div className="mt-6"><Notice tone="error">{error}</Notice></div>}
      {success && <div className="mt-6"><Notice tone="success">{success}</Notice></div>}

      {loadingProfile ? (
        <div className="mt-8 space-y-6" aria-busy="true" aria-label="Loading account">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
          ))}
        </div>
      ) : (
        <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
          <Row title="Username" hint="Letters, numbers, dots and underscores.">
            {editingField === 'username' ? (
              editor('username',
                <input
                  type="text"
                  value={editValues.username || ''}
                  onChange={(e) => setEditValues({ username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') })}
                  className={INPUT}
                  placeholder="username"
                  maxLength={30}
                  aria-label="Username"
                  autoFocus
                />
              )
            ) : (
              <>
                <span className="truncate text-sm text-zinc-950">@{profile?.username || 'not set'}</span>
                {editButton('username', profile?.username || '')}
              </>
            )}
          </Row>

          <Row title="Display name" hint="Shown on your listings and messages. Doesn’t need to be unique.">
            {editingField === 'displayName' ? (
              editor('displayName',
                <input
                  type="text"
                  value={editValues.displayName || ''}
                  onChange={(e) => setEditValues({ displayName: e.target.value })}
                  className={INPUT}
                  placeholder="Your name"
                  maxLength={100}
                  aria-label="Display name"
                  autoFocus
                />
              )
            ) : (
              <>
                <span className="truncate text-sm text-zinc-950">{profile?.displayName || currentUser?.displayName || 'Not set'}</span>
                {editButton('displayName', profile?.displayName || currentUser?.displayName || '')}
              </>
            )}
          </Row>

          <Row title="Email" hint="Changing it needs your password.">
            {editingField === 'email' ? (
              editor('email',
                <input
                  type="email"
                  value={editValues.email || ''}
                  onChange={(e) => setEditValues({ email: e.target.value })}
                  className={INPUT}
                  aria-label="Email address"
                  autoFocus
                />
              )
            ) : (
              <>
                <span className="truncate text-sm text-zinc-950">{currentUser?.email || 'Not set'}</span>
                {editButton('email', currentUser?.email || '')}
              </>
            )}
          </Row>

          <Row title="Phone" hint="Used for account recovery. Never shown to buyers.">
            {editingField === 'phoneNumber' ? (
              editor('phoneNumber',
                <input
                  type="tel"
                  value={editValues.phoneNumber || ''}
                  onChange={(e) => setEditValues({ phoneNumber: formatPhoneNumber(e.target.value) })}
                  placeholder="(555) 123-4567"
                  className={INPUT}
                  aria-label="Phone number"
                  autoFocus
                />
              )
            ) : (
              <>
                <span className="truncate text-sm text-zinc-950">{profile?.phoneNumber || 'Not set'}</span>
                {editButton('phoneNumber', profile?.phoneNumber || '')}
              </>
            )}
          </Row>

          <Row title="Profile photo" hint="JPG, PNG or WebP.">
            <ProfilePicture
              src={profile?.profilePicture || userProfile?.profilePicture}
              alt="Profile"
              name={currentUser?.displayName || undefined}
              email={currentUser?.email || undefined}
              size="md"
              className="h-10 w-10"
              currentUser={currentUser}
              userProfilePic={userProfilePic}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
            >
              <Camera strokeWidth={1.75} className="h-4 w-4" />
              {saving ? 'Uploading…' : 'Change'}
            </button>
          </Row>
        </div>
      )}
    </div>
  );

  const renderSecurity = () => (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Security</h2>
      <p className="mt-1 text-sm text-zinc-600">Sign-in and account access.</p>

      {passwordError && !showPasswordModal && <div className="mt-6"><Notice tone="error">{passwordError}</Notice></div>}
      {success && <div className="mt-6"><Notice tone="success">{success}</Notice></div>}

      <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
        <Row title="Password" hint="You’ll confirm your current password first.">
          <button type="button" onClick={() => setShowPasswordModal(true)} className="btn btn-outline px-3 py-2 text-sm">
            Change password
          </button>
        </Row>
        <Row title="Two-step verification" hint="Not available yet.">
          <span className="text-sm text-zinc-500">Not available</span>
        </Row>
        <Row title="Delete account" hint="Removes your listings, photos and profile. This can’t be undone.">
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-sm font-medium text-red-700 hover:text-red-800">
            Delete account
          </button>
        </Row>
      </div>
      {deleteError && !showDeleteConfirm && <div className="mt-6"><Notice tone="error">{deleteError}</Notice></div>}
    </div>
  );

  const renderBilling = () => (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Payments</h2>
      <p className="mt-1 text-sm text-zinc-600">Payouts go to the Stripe account you connect when you sell.</p>
      <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-6">
        <p className="text-sm text-zinc-700">
          Earnings and payout status are on your Sales page. Card billing for buyers isn’t shown here yet.
        </p>
        <Link href="/sales" className="btn btn-outline mt-4">Go to sales</Link>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
      >
        <ArrowLeft strokeWidth={1.75} className="h-4 w-4" />
        Back
      </button>

      <div className="mt-8 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Settings sections">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Settings</h1>
          <ul className="mt-6 flex gap-1 overflow-x-auto lg:flex-col">
            {SECTIONS.map((section) => {
              const active = activeSection === section.id;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                      active ? 'bg-zinc-100 font-medium text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
                    }`}
                  >
                    {section.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 animate-fade-in">
          {activeSection === 'account' && renderAccount()}
          {activeSection === 'security' && renderSecurity()}
          {activeSection === 'billing' && renderBilling()}
        </main>
      </div>

      {showPasswordModal && (
        <Dialog
          title="Change password"
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordError('');
          }}
        >
          {passwordError && <div className="mb-4"><Notice tone="error">{passwordError}</Notice></div>}
          <div className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="current-password" className="text-sm font-medium text-zinc-950">Current password</label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="new-password" className="text-sm font-medium text-zinc-950">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="input"
              />
              <p className="text-xs text-zinc-500">At least 6 characters.</p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="confirm-password" className="text-sm font-medium text-zinc-950">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordError('');
              }}
              disabled={changingPassword}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button type="button" onClick={handlePasswordChange} disabled={changingPassword} className="btn btn-primary">
              {changingPassword ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </Dialog>
      )}

      {showDeleteConfirm && (
        <Dialog
          title="Delete your account?"
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteError('');
          }}
        >
          <p className="text-sm text-zinc-700">This permanently removes:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            <li>Your account and profile</li>
            <li>Your listings and their photos</li>
            <li>Your profile from search results</li>
          </ul>
          <p className="mt-3 text-sm text-zinc-700">Your chat history stays visible to the people you talked to. This can’t be undone.</p>

          {deleteError && <div className="mt-4"><Notice tone="error">{deleteError}</Notice></div>}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteError('');
              }}
              disabled={deleting}
              className="btn btn-outline"
            >
              Keep my account
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  setDeleting(true);
                  setDeleteError('');

                  const { apiDelete } = await import('@/lib/api-client');
                  const response = await apiDelete('/api/account/delete');

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || errorData.details || 'Failed to delete account');
                  }

                  // Logout and redirect
                  await logout();
                  router.push('/');
                } catch (error: any) {
                  console.error('Account deletion error:', error);
                  setDeleteError(error?.message || 'Failed to delete account. Please try again.');
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              className={DANGER_BUTTON}
            >
              <Trash2 strokeWidth={1.75} className="mr-2 h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </Dialog>
      )}

      {showEmailReauthModal && (
        <Dialog
          title="Confirm your password"
          onClose={() => { setShowEmailReauthModal(false); setEmailReauthPassword(''); setEmailReauthError(''); }}
        >
          <p className="text-sm text-zinc-600">
            Enter your current password to change your email to <span className="font-medium text-zinc-950">{pendingNewEmail}</span>.
          </p>

          {emailReauthError && <div className="mt-4"><Notice tone="error">{emailReauthError}</Notice></div>}

          <div className="mt-4 grid gap-2">
            <label htmlFor="reauth-password" className="text-sm font-medium text-zinc-950">Current password</label>
            <input
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              value={emailReauthPassword}
              onChange={(e) => setEmailReauthPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEmailChange(); }}
              autoFocus
              className="input"
            />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => { setShowEmailReauthModal(false); setEmailReauthPassword(''); setEmailReauthError(''); }}
              disabled={changingEmail}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button type="button" onClick={handleEmailChange} disabled={changingEmail} className="btn btn-primary">
              {changingEmail ? 'Updating…' : 'Confirm'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
