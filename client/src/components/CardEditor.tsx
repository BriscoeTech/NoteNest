import { useState, useRef, useEffect, useCallback } from 'react';
import { List, Type, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card, BulletItem } from '@/lib/types';
import { generateId } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface CardEditorProps {
  card: Card | null;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  isRecycleBin: boolean;
}

export function CardEditor({ card, onUpdateCard, isRecycleBin }: CardEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bullets, setBullets] = useState<BulletItem[]>([]);
  const [showBullets, setShowBullets] = useState(false);
  const bulletRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const focusNextBullet = useRef<string | null>(null);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setContent(card.content);
      setBullets(card.bullets);
      setShowBullets(card.bullets.length > 0);
    } else {
      setTitle('');
      setContent('');
      setBullets([]);
      setShowBullets(false);
    }
  }, [card?.id]);

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

  const saveChanges = useCallback(() => {
    if (card && !isRecycleBin) {
      onUpdateCard(card.id, { title, content, bullets });
    }
  }, [card, title, content, bullets, onUpdateCard, isRecycleBin]);

  useEffect(() => {
    const timeout = setTimeout(saveChanges, 500);
    return () => clearTimeout(timeout);
  }, [title, content, bullets, saveChanges]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const addBullet = () => {
    const newBullet: BulletItem = { id: generateId(), content: '', indent: 0 };
    setBullets([...bullets, newBullet]);
    setShowBullets(true);
    focusNextBullet.current = newBullet.id;
  };

  const updateBullet = (id: string, content: string) => {
    setBullets(bullets.map(b => b.id === id ? { ...b, content } : b));
  };

  const handleBulletKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, bullet: BulletItem, index: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (bullet.indent > 0) {
          setBullets(bullets.map(b => 
            b.id === bullet.id ? { ...b, indent: b.indent - 1 } : b
          ));
        }
      } else {
        if (bullet.indent < 5) {
          setBullets(bullets.map(b => 
            b.id === bullet.id ? { ...b, indent: b.indent + 1 } : b
          ));
        }
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newBullet: BulletItem = { 
        id: generateId(), 
        content: '', 
        indent: bullet.indent 
      };
      const newBullets = [...bullets];
      newBullets.splice(index + 1, 0, newBullet);
      setBullets(newBullets);
      focusNextBullet.current = newBullet.id;
    } else if (e.key === 'Backspace' && bullet.content === '') {
      e.preventDefault();
      if (bullets.length > 1) {
        const newBullets = bullets.filter(b => b.id !== bullet.id);
        setBullets(newBullets);
        if (index > 0) {
          focusNextBullet.current = bullets[index - 1].id;
        }
      } else if (bullet.indent > 0) {
        setBullets(bullets.map(b => 
          b.id === bullet.id ? { ...b, indent: 0 } : b
        ));
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
  };

  if (!card) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No note selected</p>
          <p className="text-sm mt-1">Select a note from the list or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Button
          data-testid="button-toggle-bullets"
          variant={showBullets ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            if (!showBullets && bullets.length === 0) {
              addBullet();
            }
            setShowBullets(!showBullets);
          }}
          disabled={isRecycleBin}
          title="Toggle bullet list"
        >
          <List className="w-4 h-4" />
        </Button>
        
        {isRecycleBin && (
          <span className="text-sm text-muted-foreground ml-2">
            (Read-only in Recycle Bin)
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <Input
            data-testid="input-card-title"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            disabled={isRecycleBin}
            className="text-2xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-2 placeholder:text-muted-foreground/50"
          />

          <Textarea
            data-testid="textarea-card-content"
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing..."
            disabled={isRecycleBin}
            className="min-h-32 border-none shadow-none focus-visible:ring-0 px-0 resize-none text-foreground placeholder:text-muted-foreground/50"
          />

          {showBullets && (
            <>
              <Separator className="my-4" />
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
                  Bullet List
                  <span className="text-muted-foreground/60 font-normal ml-2">
                    Tab to indent, Shift+Tab to outdent
                  </span>
                </p>
                
                {bullets.map((bullet, index) => (
                  <div
                    key={bullet.id}
                    className="flex items-start gap-2 group"
                    style={{ paddingLeft: `${bullet.indent * 24}px` }}
                  >
                    <span className="text-muted-foreground font-bold mt-2 select-none">•</span>
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
                      disabled={isRecycleBin}
                      placeholder="Type here..."
                      className="flex-1 min-h-8 py-1 px-2 border-none shadow-none focus-visible:ring-0 resize-none text-sm bg-transparent placeholder:text-muted-foreground/40"
                      rows={1}
                    />
                    <button
                      data-testid={`button-remove-bullet-${bullet.id}`}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                      onClick={() => removeBullet(bullet.id)}
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
                    className="text-muted-foreground hover:text-foreground ml-4 mt-2"
                    onClick={addBullet}
                  >
                    + Add bullet
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}