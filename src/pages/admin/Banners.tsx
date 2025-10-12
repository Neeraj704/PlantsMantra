import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import BannerModal from '@/components/admin/BannerModal';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Banners = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (banner: any) => {
    setSelectedBanner(banner);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedBanner(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Banner deleted successfully',
      });

      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Banners</h1>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Banner
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Preview</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners?.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="h-12 object-contain"
                  />
                </TableCell>
                <TableCell className="font-medium">{banner.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {banner.link_url || '-'}
                </TableCell>
                <TableCell>{banner.display_order}</TableCell>
                <TableCell>
                  <Badge variant={banner.is_active ? 'default' : 'secondary'}>
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(banner)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteId(banner.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <BannerModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedBanner(null);
        }}
        banner={selectedBanner}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this banner? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Banners;
