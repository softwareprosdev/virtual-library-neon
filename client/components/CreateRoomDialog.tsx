import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useRouter } from 'next/navigation';

interface CreateRoomDialogProps {
  onRoomCreated?: () => void;
}

export default function CreateRoomDialog({ onRoomCreated }: CreateRoomDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genreId: ''
  });
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([]);

  // Fetch genres when dialog opens
  const fetchGenres = async () => {
    try {
      const res = await api('/rooms/genres');
      if (res.ok) {
        const data = await res.json();
        setGenres(data);
      }
    } catch (error) {
      console.error('Failed to fetch genres:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchGenres();
    } else {
      // Reset form
      setFormData({ name: '', description: '', genreId: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      const res = await api('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          genreId: formData.genreId || null
        })
      });

      if (res.ok) {
        const room = await res.json();
        setOpen(false);
        onRoomCreated?.();
        // Navigate to the newly created room
        router.push(`/room/${room.id}`);
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to create room');
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Discussion Room</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Room Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Romance Readers Paradise"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.name.length}/100 characters
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this room is about..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          <div>
            <Label htmlFor="genre">Genre (Optional)</Label>
            <Select value={formData.genreId} onValueChange={(value) => setFormData(prev => ({ ...prev, genreId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No genre</SelectItem>
                {genres.map(genre => (
                  <SelectItem key={genre.id} value={genre.id}>
                    {genre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name.trim() || loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}