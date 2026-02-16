'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Agent } from './agent-dashboard';

interface AgentDetailPageProps {
  agentId: string;
}

export function AgentDetailPage({ agentId }: AgentDetailPageProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/${agentId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Agent not found');
        }
        throw new Error('Failed to fetch agent');
      }

      const data = await response.json();
      setAgent(data.agent);
      
      // Fetch balance after getting agent
      fetchBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);

      const response = await fetch(`/api/agents/${agentId}/balance`);

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();
      setBalance(data.balance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance('0');
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchPrivateKey = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/export-key`);

      if (!response.ok) {
        throw new Error('Failed to fetch private key');
      }

      const data = await response.json();
      setPrivateKey(data.privateKey);
      setShowPrivateKey(true);
    } catch (err) {
      console.error('Error fetching private key:', err);
      alert('Failed to fetch private key');
    }
  };

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  const formatBalance = (bal: string | null) => {
    if (!bal) return '0 NEAR';
    const num = parseFloat(bal);
    if (isNaN(num)) return '0 NEAR';
    return `${num} NEAR`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex flex-col h-screen">
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-4">
            <Button variant="outline" onClick={() => router.push('/agents')}>
              ← Back to Agents
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">
              {error || 'Agent not found'}
            </h2>
            <Button onClick={() => router.push('/agents')}>
              Go to Agents Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push('/agents')}>
                ← Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                <p className="text-sm text-muted-foreground">{agent.accountId}</p>
              </div>
              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                {agent.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Agent Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Information</CardTitle>
              <CardDescription>Basic details about this autonomous agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agent.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Account ID</label>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    {agent.accountId}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Balance</label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground">
                      {balanceLoading ? 'Loading...' : formatBalance(balance)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchBalance}
                      disabled={balanceLoading}
                      className="h-6 px-2"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(agent.createdAt)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Last Updated</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(agent.updatedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Private Key Card */}
          <Card>
            <CardHeader>
              <CardTitle>Private Key</CardTitle>
              <CardDescription>
                Access the agent's private key for backup or manual operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showPrivateKey ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    The private key is securely encrypted in the database. Click below to view it.
                  </p>
                  <Button onClick={fetchPrivateKey} variant="outline">
                    View Private Key
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-4 mb-4">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      ⚠️ Warning: Keep this private key secure!
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Anyone with this key can control the account and transfer funds.
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded font-mono text-sm break-all">
                    {privateKey}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(privateKey || '');
                        alert('Private key copied to clipboard!');
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPrivateKey(false)}
                    >
                      Hide
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funding Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Fund Agent</CardTitle>
              <CardDescription>
                Add NEAR tokens to this agent's account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                To fund this agent, send NEAR tokens to:
              </p>
              <div className="bg-muted p-4 rounded font-mono text-sm break-all mb-4">
                {agent.accountId}
              </div>
              <p className="text-xs text-muted-foreground">
                You can send tokens from any NEAR wallet or use the NEAR CLI.
              </p>
            </CardContent>
          </Card>

          {/* Transaction History - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent transactions executed by this agent</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions yet. Trading functionality coming soon!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
