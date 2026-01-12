import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Search, X, Folder, FolderOpen, ChevronDown, Trash2, FolderInput, MoreVertical, List } from 'lucide-react';
import type { Card, Category, BulletItem } from '@/lib/types';
import { RECYCLE_BIN_ID, generateId, findCategoryById } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { CategoryPickerDialog } from './CategoryPickerDialog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface WorkspacePanelProps {
  cards: Card[];
  categoryId: string | null;
  categoryName: string;
  isRecycleBin: boolean;
  hasCategories: boolean;
  categories: Category[];
  currentCategory: Category | null;
  onSelectCategory: (id: string) => void;
  onAddCard: () => void;
  onAddCategory: (name: string, parentId: string | null) => void;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onMoveCard: (cardId: string, categoryId: string) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (id: string, categoryId: string) => void;
  onPermanentlyDeleteCard: (id: string) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

interface InlineCardProps {
  card: Card;
  isRecycleBin: boolean;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onMoveCard: (cardId: string) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (cardId: string) => void;
  onPermanentlyDeleteCard: (id: string) => void;
}

function InlineCard({
  card,
  isRecycleBin,
  onUpdateCard,
  onMoveCard,
  onDeleteCard,
  onRestoreCard,
  onPermanentlyDeleteCard
}: InlineCardProps) {
  const [title, setTitle] = useState(card.title);
  const [content, setContent] = useState(card.content);
  const [bullets, setBullets] = useState<BulletItem[]>(card.bullets);
  const [showBullets, setShowBullets] = useState(card.bullets.length > 0);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const bulletRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const focusNextBullet = useRef<string | null>(null);

  useEffect(() => {
    setTitle(card.title);
    setContent(card.content);
    setBullets(card.bullets);
    setShowBullets(card.bullets.length > 0);
  }, [card.id]);

  useEffect(() => {
    if (focusNextBullet.current) {
      const ref = bulletRefs.current.get(focusNextBullet.current);
      if (ref) {
        ref.focus();
        const len = ref.value.length;
        ref.setSelectionRange(len, len);
      }
      focusNextBullet.current = null;
    }
  }, [bullets]);

  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  useEffect(() => {
    if (titleRef.current) autoResize(titleRef.current);
    if (contentRef.current) autoResize(contentRef.current);
  }, [title, content]);

  const saveChanges = useCallback((newTitle: string, newContent: string, newBullets: BulletItem[]) => {
    if (!isRecycleBin) {
      onUpdateCard(card.id, { title: newTitle, content: newContent, bullets: newBullets });
    }
  }, [card.id, onUpdateCard, isRecycleBin]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    saveChanges(newTitle, content, bullets);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    saveChanges(title, newContent, bullets);
  };

  const addBullet = () => {
    const newBullet: BulletItem = { id: generateId(), content: '', indent: 0 };
    const newBullets = [...bullets, newBullet];
    setBullets(newBullets);
    setShowBullets(true);
    focusNextBullet.current = newBullet.id;
    saveChanges(title, content, newBullets);
  };

  const updateBullet = (id: string, bulletContent: string) => {
    const newBullets = bullets.map(b => b.id === id ? { ...b, content: bulletContent } : b);
    setBullets(newBullets);
    saveChanges(title, content, newBullets);
  };

  const handleBulletKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, bullet: BulletItem, index: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      let newBullets;
      if (e.shiftKey) {
        if (bullet.indent > 0) {
          newBullets = bullets.map(b => b.id === bullet.id ? { ...b, indent: b.indent - 1 } : b);
          setBullets(newBullets);
          saveChanges(title, content, newBullets);
        }
      } else {
        if (bullet.indent < 5) {
          newBullets = bullets.map(b => b.id === bullet.id ? { ...b, indent: b.indent + 1 } : b);
          setBullets(newBullets);
          saveChanges(title, content, newBullets);
        }
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newBullet: BulletItem = { id: generateId(), content: '', indent: bullet.indent };
      const newBullets = [...bullets];
      newBullets.splice(index + 1, 0, newBullet);
      setBullets(newBullets);
      focusNextBullet.current = newBullet.id;
      saveChanges(title, content, newBullets);
    } else if (e.key === 'Backspace' && bullet.content === '') {
      e.preventDefault();
      if (bullets.length > 1) {
        const newBullets = bullets.filter(b => b.id !== bullet.id);
        setBullets(newBullets);
        if (index > 0) {
          focusNextBullet.current = bullets[index - 1].id;
        }
        saveChanges(title, content, newBullets);
      } else if (bullet.indent > 0) {
        const newBullets = bullets.map(b => b.id === bullet.id ? { ...b, indent: 0 } : b);
        setBullets(newBullets);
        saveChanges(title, content, newBullets);
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      const textarea = e.target as HTMLTextAreaElement;
      if (textarea.selectionStart === 0) {
        e.preventDefault();
        focusNextBullet.current = bullets[index - 1].id;
        setBullets([...bullets]);
      }
    } else if (e.key === 'ArrowDown' && index < bullets.length - 1) {
      const textarea = e.target as HTMLTextAreaElement;
      if (textarea.selectionEnd === textarea.value.length) {
        e.preventDefault();
        focusNextBullet.current = bullets[index + 1].id;
        setBullets([...bullets]);
      }
    }
  };

  const removeBullet = (id: string) => {
    const newBullets = bullets.filter(b => b.id !== id);
    setBullets(newBullets);
    if (newBullets.length === 0) {
      setShowBullets(false);
    }
    saveChanges(title, content, newBullets);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-testid={`card-item-${card.id}`}
          className="border rounded-lg bg-card p-4 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              <Textarea
                ref={titleRef}
                data-testid={`card-title-${card.id}`}
                value={title}
                onChange={handleTitleChange}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                placeholder="Untitled"
                disabled={isRecycleBin}
                className="text-base font-semibold border-none shadow-none focus-visible:ring-0 p-0 resize-none min-h-0 overflow-hidden placeholder:text-muted-foreground/50 bg-transparent"
                rows={1}
              />

              <Textarea
                ref={contentRef}
                data-testid={`card-content-${card.id}`}
                value={content}
                onChange={handleContentChange}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                placeholder="Add notes..."
                disabled={isRecycleBin}
                className="text-sm border-none shadow-none focus-visible:ring-0 p-0 resize-none min-h-0 overflow-hidden text-muted-foreground placeholder:text-muted-foreground/40 bg-transparent"
                rows={1}
              />

              {showBullets && (
                <div className="space-y-0.5 pt-1">
                  {bullets.map((bullet, index) => (
                    <div
                      key={bullet.id}
                      className="flex items-start gap-1 group"
                      style={{ paddingLeft: `${bullet.indent * 16}px` }}
                    >
                      <span className="text-muted-foreground font-bold mt-0.5 select-none text-xs">•</span>
                      <Textarea
                        ref={(el) => {
                          if (el) {
                            bulletRefs.current.set(bullet.id, el);
                          } else {
                            bulletRefs.current.delete(bullet.id);
                          }
                        }}
                        data-testid={`bullet-${card.id}-${bullet.id}`}
                        value={bullet.content}
                        onChange={(e) => updateBullet(bullet.id, e.target.value)}
                        onKeyDown={(e) => handleBulletKeyDown(e, bullet, index)}
                        onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                        disabled={isRecycleBin}
                        placeholder="..."
                        className="flex-1 min-h-0 py-0 px-0.5 border-none shadow-none focus-visible:ring-0 resize-none text-xs bg-transparent placeholder:text-muted-foreground/30 overflow-hidden text-foreground"
                        rows={1}
                      />
                      <button
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={() => removeBullet(bullet.id)}
                        disabled={isRecycleBin}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {!isRecycleBin && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => {
                      if (!showBullets && bullets.length === 0) {
                        addBullet();
                      } else if (!showBullets) {
                        setShowBullets(true);
                      } else {
                        addBullet();
                      }
                    }}
                  >
                    <List className="w-3 h-3" />
                    {showBullets ? 'Add bullet' : 'Add bullets'}
                  </button>
                )}
                <span className="text-xs text-muted-foreground/50 ml-auto">
                  {formatDistanceToNow(card.updatedAt, { addSuffix: true })}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid={`card-menu-${card.id}`}
                  className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isRecycleBin ? (
                  <>
                    <DropdownMenuItem onClick={() => onRestoreCard(card.id)}>
                      Restore to...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onPermanentlyDeleteCard(card.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => onMoveCard(card.id)}>
                      <FolderInput className="w-4 h-4 mr-2" />
                      Move to...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDeleteCard(card.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {isRecycleBin ? (
          <>
            <ContextMenuItem onClick={() => onRestoreCard(card.id)}>
              Restore to...
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => onPermanentlyDeleteCard(card.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onClick={() => onMoveCard(card.id)}>
              <FolderInput className="w-4 h-4 mr-2" />
              Move to...
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => onDeleteCard(card.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function WorkspacePanel({
  cards,
  categoryId,
  categoryName,
  isRecycleBin,
  hasCategories,
  categories,
  currentCategory,
  onSelectCategory,
  onAddCard,
  onAddCategory,
  onUpdateCard,
  onMoveCard,
  onDeleteCard,
  onRestoreCard,
  onPermanentlyDeleteCard,
  onSearch,
  searchQuery
}: WorkspacePanelProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [cardToMove, setCardToMove] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingAsTopLevel, setAddingAsTopLevel] = useState(false);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  const subcategories = currentCategory?.children || [];

  useEffect(() => {
    if (isAddingCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [isAddingCategory]);

  const handleMoveClick = (cardId: string) => {
    setCardToMove(cardId);
    setIsRestoring(false);
    setMoveDialogOpen(true);
  };

  const handleRestoreClick = (cardId: string) => {
    setCardToMove(cardId);
    setIsRestoring(true);
    setMoveDialogOpen(true);
  };

  const handleCategorySelect = (targetCategoryId: string | null) => {
    if (cardToMove && targetCategoryId) {
      if (isRestoring) {
        onRestoreCard(cardToMove, targetCategoryId);
      } else {
        onMoveCard(cardToMove, targetCategoryId);
      }
    }
    setMoveDialogOpen(false);
    setCardToMove(null);
  };

  const startAddCategory = (asTopLevel: boolean) => {
    setAddingAsTopLevel(asTopLevel);
    setIsAddingCategory(true);
    setNewCategoryName('');
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const parentId = addingAsTopLevel ? null : categoryId;
      onAddCategory(newCategoryName.trim(), parentId);
    }
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  const isValidCategory = categoryId && categoryId !== RECYCLE_BIN_ID;

  if (!categoryId) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Folder className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {hasCategories ? 'Select a Category' : 'Create Your First Category'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {hasCategories 
              ? 'Choose a category from the sidebar to view and create notes.'
              : 'Notes must belong to a category. Create one to get started.'}
          </p>
          {!hasCategories && (
            isAddingCategory ? (
              <div className="flex gap-2 justify-center">
                <Input
                  ref={newCategoryInputRef}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onBlur={handleAddCategory}
                  onKeyDown={handleCategoryKeyDown}
                  placeholder="Category name..."
                  className="w-48"
                />
              </div>
            ) : (
              <Button onClick={() => startAddCategory(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Category
              </Button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground truncate">{categoryName}</h2>
          {isValidCategory && (
            <div className="flex items-center gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="button-add-category"
                    variant="outline"
                    size="sm"
                  >
                    <Folder className="w-4 h-4 mr-1" />
                    New Category
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => startAddCategory(false)}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Subcategory in "{categoryName}"
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => startAddCategory(true)}>
                    <Folder className="w-4 h-4 mr-2" />
                    Top-Level Category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                data-testid="button-add-card"
                size="sm"
                onClick={onAddCard}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Note
              </Button>
            </div>
          )}
        </div>

        {isAddingCategory && (
          <div className="flex gap-2">
            <Input
              ref={newCategoryInputRef}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onBlur={handleAddCategory}
              onKeyDown={handleCategoryKeyDown}
              placeholder={addingAsTopLevel ? "New top-level category..." : `New subcategory in ${categoryName}...`}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddCategory}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAddingCategory(false)}>Cancel</Button>
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-cards"
            type="search"
            placeholder="Search in this category..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearch('')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {subcategories.length === 0 && cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg font-medium">
              {searchQuery ? 'No matching notes' : isRecycleBin ? 'Recycle bin is empty' : 'Empty category'}
            </p>
            <p className="text-sm mt-1">
              {searchQuery 
                ? 'Try a different search term' 
                : isRecycleBin 
                  ? 'Deleted notes will appear here' 
                  : 'Create notes or subcategories to get started'}
            </p>
            {isValidCategory && !searchQuery && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => startAddCategory(false)}>
                  <Folder className="w-4 h-4 mr-1" />
                  New Subcategory
                </Button>
                <Button onClick={onAddCard}>
                  <Plus className="w-4 h-4 mr-1" />
                  New Note
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {subcategories.length > 0 && !searchQuery && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {subcategories.map(sub => (
                  <div
                    key={sub.id}
                    data-testid={`subcategory-${sub.id}`}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => onSelectCategory(sub.id)}
                  >
                    <FolderOpen className="w-10 h-10 text-primary/70" />
                    <span className="text-sm font-medium text-center truncate w-full">{sub.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {sub.children.length > 0 ? `${sub.children.length} folders` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {subcategories.length > 0 && cards.length > 0 && !searchQuery && (
              <div className="border-t border-border my-4" />
            )}

            {cards.length > 0 && (
              <div className="space-y-3">
                {cards.map(card => (
                  <InlineCard
                    key={card.id}
                    card={card}
                    isRecycleBin={isRecycleBin}
                    onUpdateCard={onUpdateCard}
                    onMoveCard={handleMoveClick}
                    onDeleteCard={onDeleteCard}
                    onRestoreCard={handleRestoreClick}
                    onPermanentlyDeleteCard={onPermanentlyDeleteCard}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CategoryPickerDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        categories={categories}
        onSelect={handleCategorySelect}
        title={isRestoring ? "Restore to Category" : "Move to Category"}
        showRoot={false}
      />
    </div>
  );
}