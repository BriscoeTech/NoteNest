import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, List, Trash2, MoreVertical, FolderInput } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card, BulletItem, Category } from '@/lib/types';
import { generateId } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface InlineCardEditorProps {
  card: Card;
  isExpanded: boolean;
  isRecycleBin: boolean;
  onToggleExpand: () => void;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onMoveCard: (cardId: string) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (cardId: string) => void;
  onPermanentlyDeleteCard: (id: string) => void;
}

export function InlineCardEditor({
  card,
  isExpanded,
  isRecycleBin,
  onToggleExpand,
  onUpdateCard,
  onMoveCard,
  onDeleteCard,
  onRestoreCard,
  onPermanentlyDeleteCard
}: InlineCardEditorProps) {
  const [title, setTitle] = useState(card.title);
  const [content, setContent] = useState(card.content);
  const [bullets, setBullets] = useState<BulletItem[]>(card.bullets);
  const [showBullets, setShowBullets] = useState(card.bullets.length > 0);
  const bulletRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const focusNextBullet = useRef<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(card.title);
    setContent(card.content);
    setBullets(card.bullets);
    setShowBullets(card.bullets.length > 0);
  }, [card.id, card.title, card.content, card.bullets]);

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

  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  useEffect(() => {
    if (isExpanded) {
      if (titleRef.current) autoResize(titleRef.current);
      if (contentRef.current) autoResize(contentRef.current);
    }
  }, [isExpanded, title, content]);

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

  const getCardPreview = (): string => {
    if (content) return content.slice(0, 80);
    if (bullets.length > 0) {
      return bullets.map(b => '• ' + b.content).join(' ').slice(0, 80);
    }
    return 'Empty note';
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-testid={`card-item-${card.id}`}
          className={cn(
            "border rounded-lg bg-card transition-all",
            isExpanded ? "ring-2 ring-primary/30" : "hover:border-primary/30"
          )}
        >
          <div
            className="flex items-start gap-3 p-4 cursor-pointer"
            onClick={onToggleExpand}
          >
            <button className="mt-1 text-muted-foreground">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {title || 'Untitled'}
              </h3>
              {!isExpanded && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {getCardPreview()}
                </p>
              )}
              <p className="text-xs text-muted-foreground/60 mt-2">
                {formatDistanceToNow(card.updatedAt, { addSuffix: true })}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid={`card-menu-${card.id}`}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
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

          {isExpanded && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-4 ml-7">
              <Textarea
                ref={titleRef}
                data-testid="input-card-title"
                value={title}
                onChange={handleTitleChange}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                placeholder="Untitled"
                disabled={isRecycleBin}
                className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 resize-none min-h-0 overflow-hidden placeholder:text-muted-foreground/50"
                rows={1}
              />

              <Textarea
                ref={contentRef}
                data-testid="textarea-card-content"
                value={content}
                onChange={handleContentChange}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                placeholder="Start writing..."
                disabled={isRecycleBin}
                className="border-none shadow-none focus-visible:ring-0 p-0 resize-none min-h-[60px] overflow-hidden text-foreground placeholder:text-muted-foreground/50"
                rows={2}
              />

              <div className="flex items-center gap-2 pt-2">
                <Button
                  data-testid="button-toggle-bullets"
                  variant={showBullets ? "secondary" : "ghost"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!showBullets && bullets.length === 0) {
                      addBullet();
                    }
                    setShowBullets(!showBullets);
                  }}
                  disabled={isRecycleBin}
                  title="Toggle bullet list"
                >
                  <List className="w-4 h-4 mr-1" />
                  Bullets
                </Button>
                
                {isRecycleBin && (
                  <span className="text-xs text-muted-foreground">
                    (Read-only)
                  </span>
                )}
              </div>

              {showBullets && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    Tab to indent, Shift+Tab to outdent, Enter for new bullet
                  </p>
                  
                  {bullets.map((bullet, index) => (
                    <div
                      key={bullet.id}
                      className="flex items-start gap-2 group"
                      style={{ paddingLeft: `${bullet.indent * 20}px` }}
                    >
                      <span className="text-muted-foreground font-bold mt-1.5 select-none text-sm">•</span>
                      <Textarea
                        ref={(el) => {
                          if (el) {
                            bulletRefs.current.set(bullet.id, el);
                          } else {
                            bulletRefs.current.delete(bullet.id);
                          }
                        }}
                        data-testid={`bullet-item-${bullet.id}`}
                        value={bullet.content}
                        onChange={(e) => updateBullet(bullet.id, e.target.value)}
                        onKeyDown={(e) => handleBulletKeyDown(e, bullet, index)}
                        onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                        disabled={isRecycleBin}
                        placeholder="Type here..."
                        className="flex-1 min-h-0 py-1 px-1 border-none shadow-none focus-visible:ring-0 resize-none text-sm bg-transparent placeholder:text-muted-foreground/40 overflow-hidden"
                        rows={1}
                      />
                      <button
                        data-testid={`button-remove-bullet-${bullet.id}`}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBullet(bullet.id);
                        }}
                        disabled={isRecycleBin}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  {!isRecycleBin && (
                    <Button
                      data-testid="button-add-bullet"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground text-xs mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        addBullet();
                      }}
                    >
                      + Add bullet
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
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