'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Heart,
  MessageCircle,
  MapPin,
  DollarSign,
  Tag,
  Eye,
  Loader2,
  ShoppingBag,
  X,
  Bookmark
} from 'lucide-react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: string;
  category: string;
  images: string[];
  location?: string;
  status: string;
  viewCount: number;
  createdAt: string;
  seller: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
    location?: string;
  };
  _count?: {
    savedBy: number;
  };
  isSaved?: boolean;
}

const CATEGORIES = [
  'All',
  'Books',
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
  'Toys & Games',
  'Vehicles',
  'Other'
];

const CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' }
];

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('browse');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [newListing, setNewListing] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Books',
    condition: 'GOOD',
    images: [''],
    location: ''
  });

  const currentUser = getUser();

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'browse') {
        const params = new URLSearchParams();
        if (selectedCategory !== 'All') params.append('category', selectedCategory);
        if (searchQuery) params.append('search', searchQuery);

        const response = await api(`/marketplace?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setListings(data.listings || []);
        }
      } else if (activeTab === 'saved') {
        const response = await api('/marketplace/saved/me');
        if (response.ok) {
          const data = await response.json();
          setListings(data.listings || []);
        }
      } else if (activeTab === 'my-listings' && currentUser) {
        const response = await api(`/marketplace/user/${currentUser.id}`);
        if (response.ok) {
          const data = await response.json();
          setListings(data.listings || []);
        }
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, activeTab, currentUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchListings]);

  const handleCreateListing = async () => {
    if (!newListing.title || !newListing.description || !newListing.price) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api('/marketplace', {
        method: 'POST',
        body: JSON.stringify({
          ...newListing,
          price: parseFloat(newListing.price),
          images: newListing.images.filter(img => img.trim())
        })
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewListing({
          title: '',
          description: '',
          price: '',
          category: 'Books',
          condition: 'GOOD',
          images: [''],
          location: ''
        });
        fetchListings();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Failed to create listing');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveListing = async (listingId: string) => {
    try {
      const response = await api(`/marketplace/${listingId}/save`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setListings(prev =>
          prev.map(l =>
            l.id === listingId
              ? { ...l, isSaved: data.saved }
              : l
          )
        );
        
        // If we're on the saved tab and unsaved it, remove it from the list
        if (activeTab === 'saved' && !data.saved) {
           setListings(prev => prev.filter(l => l.id !== listingId));
        }

        if (selectedListing?.id === listingId) {
          setSelectedListing(prev => prev ? { ...prev, isSaved: data.saved } : null);
        }
      }
    } catch (error) {
      console.error('Error saving listing:', error);
    }
  };

  const handleContactSeller = (listing: Listing) => {
    // Navigate to messages with the seller
    router.push(`/messages?userId=${listing.seller.id}`);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'NEW': return 'bg-green-500';
      case 'LIKE_NEW': return 'bg-emerald-500';
      case 'GOOD': return 'bg-blue-500';
      case 'FAIR': return 'bg-yellow-500';
      case 'POOR': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const renderListings = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (listings.length === 0) {
      return (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No listings found</h3>
          <p className="text-muted-foreground">
            {activeTab === 'saved' 
              ? 'You haven\'t saved any listings yet' 
              : activeTab === 'my-listings'
              ? 'You haven\'t created any listings yet'
              : searchQuery 
                ? 'Try a different search term' 
                : 'Be the first to create a listing!'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.map(listing => (
          <Card
            key={listing.id}
            className="cursor-pointer hover:shadow-lg transition-all overflow-hidden group"
            onClick={() => setSelectedListing(listing)}
          >
            <div className="aspect-square relative bg-secondary/30">
              {listing.images[0] ? (
                <Image
                  src={listing.images[0]}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Tag className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
              <Badge
                className={`absolute top-2 left-2 ${getConditionColor(listing.condition)}`}
              >
                {listing.condition.replace('_', ' ')}
              </Badge>
              <Button
                size="icon"
                variant="secondary"
                className={`absolute top-2 right-2 transition-opacity ${listing.isSaved ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveListing(listing.id);
                }}
              >
                <Bookmark
                  className={`w-4 h-4 ${listing.isSaved ? 'fill-current text-primary' : ''}`}
                />
              </Button>
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold truncate flex-1">{listing.title}</h3>
                <span className="font-bold text-primary ml-2">
                  ${listing.price.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {listing.description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {listing.location || listing.seller.location || 'No location'}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {listing.viewCount}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-8 h-8" />
              Marketplace
            </h1>
            <p className="text-muted-foreground mt-1">
              Buy and sell with your community - contact sellers directly
            </p>
          </div>

          {currentUser && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Listing
            </Button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
            {currentUser && <TabsTrigger value="my-listings">My Listings</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse" className="mt-6">
            {renderListings()}
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            {renderListings()}
          </TabsContent>

          <TabsContent value="my-listings" className="mt-6">
            {renderListings()}
          </TabsContent>
        </Tabs>

        {/* Create Listing Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Listing</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  placeholder="What are you selling?"
                  value={newListing.title}
                  onChange={(e) => setNewListing(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                  placeholder="Describe your item..."
                  rows={4}
                  value={newListing.description}
                  onChange={(e) => setNewListing(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Price * ($)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={newListing.price}
                    onChange={(e) => setNewListing(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <Select
                    value={newListing.category}
                    onValueChange={(v) => setNewListing(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.slice(1).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Condition</label>
                <Select
                  value={newListing.condition}
                  onValueChange={(v) => setNewListing(prev => ({ ...prev, condition: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Image URL (optional)</label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={newListing.images[0]}
                  onChange={(e) => setNewListing(prev => ({ ...prev, images: [e.target.value] }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Location (optional)</label>
                <Input
                  placeholder="City, State"
                  value={newListing.location}
                  onChange={(e) => setNewListing(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Note: All transactions happen off-platform. Contact buyers/sellers via messaging to arrange meetups.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateListing} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Listing'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Listing Detail Dialog */}
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedListing && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedListing.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Image */}
                  {selectedListing.images[0] && (
                    <div className="aspect-video relative rounded-lg overflow-hidden bg-secondary">
                      <Image
                        src={selectedListing.images[0]}
                        alt={selectedListing.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}

                  {/* Price and condition */}
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-primary">
                      ${selectedListing.price.toFixed(2)}
                    </span>
                    <Badge className={getConditionColor(selectedListing.condition)}>
                      {selectedListing.condition.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {selectedListing.description}
                  </p>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      {selectedListing.category}
                    </div>
                    {selectedListing.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedListing.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {selectedListing.viewCount} views
                    </div>
                  </div>

                  {/* Seller */}
                  <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={selectedListing.seller.avatarUrl} />
                        <AvatarFallback>
                          {(selectedListing.seller.displayName || selectedListing.seller.name).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {selectedListing.seller.displayName || selectedListing.seller.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Listed {formatDistanceToNow(new Date(selectedListing.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <Button onClick={() => handleContactSeller(selectedListing)}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Seller
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    All transactions happen off-platform. Meet in a safe, public location.
                  </p>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
