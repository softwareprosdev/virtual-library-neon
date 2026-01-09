'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  Shield,
  Ban,
  AlertTriangle,
  Activity,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Book,
  Home,
  Flag,
  Clock,
  CheckCircle,
  XCircle,
  UserX,
  UserCheck,
  Trash2
} from 'lucide-react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isBanned: boolean;
  banReason: string | null;
  warningCount: number;
  createdAt: string;
  lastLoginAt: string | null;
  points: number;
  level: number;
  _count: {
    messages: number;
    books: number;
    ownedRooms: number;
  };
}

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reporter: { id: string; name: string | null; email: string };
  reported: { id: string; name: string | null; email: string; isBanned: boolean };
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalRooms: number;
  activeRooms: number;
  totalMessages: number;
  totalBooks: number;
  pendingReports: number;
}

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<'ban' | 'warn' | 'role' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [newRole, setNewRole] = useState<string>('USER');

  const fetchStats = useCallback(async () => {
    try {
      const response = await api('/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentUsers(data.recentUsers);
      } else if (response.status === 403) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [router]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api(`/admin/users?page=${currentPage}&search=${searchQuery}&filter=${userFilter}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, [currentPage, searchQuery, userFilter]);

  const fetchReports = useCallback(async () => {
    try {
      const response = await api('/admin/reports?status=PENDING');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchReports()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchReports]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBanUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await api(`/admin/users/${selectedUser.id}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason: actionReason })
      });
      if (response.ok) {
        setActionDialog(null);
        setSelectedUser(null);
        setActionReason('');
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const response = await api(`/admin/users/${userId}/unban`, { method: 'POST' });
      if (response.ok) {
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to unban user:', error);
    }
  };

  const handleWarnUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await api(`/admin/users/${selectedUser.id}/warn`, {
        method: 'POST',
        body: JSON.stringify({ reason: actionReason })
      });
      if (response.ok) {
        setActionDialog(null);
        setSelectedUser(null);
        setActionReason('');
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to warn user:', error);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    try {
      const response = await api(`/admin/users/${selectedUser.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        setActionDialog(null);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const handleResolveReport = async (reportId: string, status: string) => {
    try {
      const response = await api(`/admin/reports/${reportId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, resolution: 'Reviewed by admin' })
      });
      if (response.ok) {
        fetchReports();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to resolve report:', error);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                <Shield className="w-8 h-8" />
                Admin Panel
              </h1>
              <p className="text-muted-foreground mt-1">Manage users, content, and platform settings</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.activeUsers}</p>
                      <p className="text-xs text-muted-foreground">Active (7d)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Ban className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.bannedUsers}</p>
                      <p className="text-xs text-muted-foreground">Banned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Flag className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.pendingReports}</p>
                      <p className="text-xs text-muted-foreground">Reports</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Reports
                {stats && stats.pendingReports > 0 && (
                  <Badge variant="destructive" className="ml-1">{stats.pendingReports}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <CardTitle>User Management</CardTitle>
                    <div className="flex gap-2">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={userFilter} onValueChange={setUserFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="banned">Banned</SelectItem>
                          <SelectItem value="admin">Admins</SelectItem>
                          <SelectItem value="moderator">Mods</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">User</th>
                          <th className="text-left p-3 text-sm font-medium">Role</th>
                          <th className="text-left p-3 text-sm font-medium">Status</th>
                          <th className="text-left p-3 text-sm font-medium">Stats</th>
                          <th className="text-left p-3 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{user.displayName || user.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'MODERATOR' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {user.isBanned ? (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <Ban className="w-3 h-3" />
                                  Banned
                                </Badge>
                              ) : user.warningCount > 0 ? (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit text-yellow-500 border-yellow-500">
                                  <AlertTriangle className="w-3 h-3" />
                                  {user.warningCount} warnings
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-500 border-green-500">Active</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {user._count.messages}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Book className="w-3 h-3" />
                                  {user._count.books}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Home className="w-3 h-3" />
                                  {user._count.ownedRooms}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => router.push(`/profile/${user.id}`)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {user.isBanned ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-green-500"
                                    onClick={() => handleUnbanUser(user.id)}
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setActionDialog('ban');
                                    }}
                                  >
                                    <UserX className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-yellow-500"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setActionDialog('warn');
                                  }}
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setNewRole(user.role);
                                    setActionDialog('role');
                                  }}
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {reports.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No pending reports</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reports.map((report) => (
                        <div key={report.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-red-500">{report.reason}</p>
                              <p className="text-sm text-muted-foreground">
                                Reported by {report.reporter.name || report.reporter.email}
                              </p>
                            </div>
                            <Badge variant="outline">{new Date(report.createdAt).toLocaleDateString()}</Badge>
                          </div>
                          
                          <div className="bg-muted/50 p-3 rounded mb-3">
                            <p className="text-sm font-medium mb-1">Reported User:</p>
                            <p className="text-sm">{report.reported.name || report.reported.email}</p>
                            {report.reported.isBanned && (
                              <Badge variant="destructive" className="mt-1">Already Banned</Badge>
                            )}
                          </div>
                          
                          {report.details && (
                            <p className="text-sm text-muted-foreground mb-3">{report.details}</p>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleResolveReport(report.id, 'RESOLVED')}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Take Action
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveReport(report.id, 'DISMISSED')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/profile/${report.reported.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Profile
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                          <span>Total Rooms</span>
                          <span className="font-bold">{stats.totalRooms}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                          <span>Active Rooms</span>
                          <span className="font-bold text-green-500">{stats.activeRooms}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                          <span>Total Messages</span>
                          <span className="font-bold">{stats.totalMessages}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                          <span>Total Books</span>
                          <span className="font-bold">{stats.totalBooks}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                          <span>Total Users</span>
                          <span className="font-bold">{stats.totalUsers}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                          <span>Active (Last 7 Days)</span>
                          <span className="font-bold text-green-500">{stats.activeUsers}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                          <span>Banned Users</span>
                          <span className="font-bold text-red-500">{stats.bannedUsers}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                          <span>Active Rate</span>
                          <span className="font-bold">
                            {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Recent Activity Tab */}
            <TabsContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Signups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">{user.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}>{user.role}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Ban Dialog */}
      <Dialog open={actionDialog === 'ban'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Ban className="w-5 h-5" />
              Ban User
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to ban <strong>{selectedUser?.displayName || selectedUser?.name || selectedUser?.email}</strong>?
            </p>
            <Textarea
              placeholder="Reason for ban..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBanUser}>Ban User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warn Dialog */}
      <Dialog open={actionDialog === 'warn'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="w-5 h-5" />
              Warn User
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Issue a warning to <strong>{selectedUser?.displayName || selectedUser?.name || selectedUser?.email}</strong>
            </p>
            <Textarea
              placeholder="Reason for warning..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button className="bg-yellow-500 hover:bg-yellow-600" onClick={handleWarnUser}>Issue Warning</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={actionDialog === 'role'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Change Role
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Change role for <strong>{selectedUser?.displayName || selectedUser?.name || selectedUser?.email}</strong>
            </p>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleChangeRole}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
