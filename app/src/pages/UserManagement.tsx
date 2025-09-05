import { useState, useEffect } from 'react';
import { User } from '../types';
import { addAuthHeader } from '../utils/api';

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ name: '', avatarUrl: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', addAuthHeader());
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newUser.name.trim()) {
      setError('ユーザー名は必須です。');
      return;
    }
    try {
      const response = await fetch('/api/users', addAuthHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      }));
      if (!response.ok) throw new Error('Failed to add user');
      setNewUser({ name: '', avatarUrl: '' });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser({ name: user.name, avatarUrl: user.avatarUrl });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editingUser || !newUser.name.trim()) {
      setError('ユーザー名は必須です。');
      return;
    }
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, addAuthHeader({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUser.name, avatarUrl: newUser.avatarUrl }),
      }));
      if (!response.ok) throw new Error('Failed to update user');
      setEditingUser(null);
      setNewUser({ name: '', avatarUrl: '' });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDeleteUser = async (id: string) => {
    setError(null);
    if (!window.confirm('本当にこのユーザーを削除しますか？')) return;
    try {
      const response = await fetch(`/api/users/${id}`, addAuthHeader({
        method: 'DELETE',
      }));
      if (!response.ok) throw new Error('Failed to delete user');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="card">
      <h1>ユーザー管理</h1>
      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ marginBottom: '2rem' }}>
        <h2>{editingUser ? 'ユーザーを編集' : '新しいユーザーを追加'}</h2>
        <form onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="userName">ユーザー名</label>
            <input
              id="userName"
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="avatarUrl">アバターURL (オプション)</label>
            <input
              id="avatarUrl"
              type="text"
              value={newUser.avatarUrl}
              onChange={(e) => setNewUser({ ...newUser, avatarUrl: e.target.value })}
            />
          </div>
          <button type="submit">{editingUser ? '更新' : '追加'}</button>
          {editingUser && <button type="button" onClick={() => { setEditingUser(null); setNewUser({ name: '', avatarUrl: '' }); }} style={{ marginLeft: '0.5rem' }}>キャンセル</button>}
        </form>
      </div>

      <h2>既存ユーザー</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map(user => (
          <li key={user.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: 'var(--border-radius)' }}>
            <img src={user.avatarUrl || 'https://i.pravatar.cc/150?img=' + user.id} alt={user.name} style={{ width: '32px', height: '32px', borderRadius: '50%', marginRight: '1rem' }} />
            <span style={{ flex: 1 }}>{user.name}</span>
            <button type="button" onClick={() => handleEditUser(user)}>編集</button>
            <button type="button" onClick={() => handleDeleteUser(user.id)} style={{ marginLeft: '0.5rem', backgroundColor: '#dc3545' }}>削除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserManagement;
