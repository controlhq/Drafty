import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

export type Tool = 'pen' | 'eraser';
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;
const CUSTOM_ID_KEY = 'customId';
const AUTHOR_ID_KEY = 'authorId';

export interface PageInfo {
  id: string;
  name: string;
  // objects: { [objectId]: { fabricJSON, authorId } }
  objects: Record<string, { fabricJSON: any; authorId: string }>;
}

export function useCanvas(options: any = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const isApplyingRemote = useRef(false);

  // --- GŁÓWNY MAGAZYN DANYCH ---
  const pagesRef = useRef<PageInfo[]>([{ id: uuidv4(), name: 'Strona 1', objects: {} }]);

  // --- HISTORIA COFANIA ---
  const myObjectsHistory = useRef<Map<string, string[]>>(new Map());

  // --- WIDOCZNOŚĆ UŻYTKOWNIKÓW (lokalnie) ---
  // socketId -> boolean (true = widoczny, domyślnie true)
  const hiddenAuthors = useRef<Set<string>>(new Set());

  const [pages, setPagesState] = useState<PageInfo[]>(pagesRef.current);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentColor, setCurrentColorState] = useState('#000000');
  // Stan widoczności eksponowany na zewnątrz (do re-renderu UI)
  const [hiddenAuthorsState, setHiddenAuthorsState] = useState<Set<string>>(new Set());

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const currentPageIndexRef = useRef(0);
  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  const getMyHistory = (pageId: string): string[] => {
    if (!myObjectsHistory.current.has(pageId)) {
      myObjectsHistory.current.set(pageId, []);
    }
    return myObjectsHistory.current.get(pageId)!;
  };

  // --- LOGIKA WEWNĘTRZNA ---

  /**
   * Pobiera dane canvasu (tylko obiekty widoczne + niewidoczne — cały magazyn).
   * Używane do zapisu stanu strony przed przełączeniem.
  
  const getCanvasData = useCallback((): Record<string, { fabricJSON: any; authorId: string }> => {
    if (!canvas.current) return {};
    const data: Record<string, { fabricJSON: any; authorId: string }> = {};
    canvas.current.getObjects().forEach((obj: any) => {
      if (obj.customId) {
        data[obj.customId] = {
          fabricJSON: obj.toJSON([CUSTOM_ID_KEY, AUTHOR_ID_KEY]),
          authorId: obj.authorId || '',
        };
      }
    });
    return data;
  }, []);
  */
  /**
   * Ładuje dane strony na canvas, respektując aktualnie ukrytych autorów.
   */
  const loadDataToCanvas = useCallback((data: Record<string, { fabricJSON: any; authorId: string }>) => {
    if (!canvas.current) return;
    const c = canvas.current;

    isApplyingRemote.current = true;
    c.clear();
    c.setBackgroundColor('#ffffff', () => {
      const entries = Object.entries(data);
      // Obiekty z pustym authorId (np. własne lub ze starszego formatu) nigdy nie są ukrywane
      const visibleEntries = entries.filter(([, v]) => !v.authorId || !hiddenAuthors.current.has(v.authorId));

      if (visibleEntries.length === 0) {
        c.renderAll();
        isApplyingRemote.current = false;
        return;
      }

      const fabricObjects = visibleEntries.map(([, v]) => v.fabricJSON);
      const ids = visibleEntries.map(([id]) => id);
      const authors = visibleEntries.map(([, v]) => v.authorId);

      (fabric.util.enlivenObjects as any)(fabricObjects, (enlivened: fabric.Object[]) => {
        enlivened.forEach((obj, i) => {
          (obj as any).customId = ids[i];
          (obj as any).authorId = authors[i];
          obj.selectable = false;
          obj.evented = false;
          c.add(obj);
        });
        c.renderAll();
        isApplyingRemote.current = false;
      }, 'fabric');
    });
  }, []);

  // --- INICJALIZACJA PŁÓTNA ---

  useEffect(() => {
    if (!canvasRef.current || canvas.current) return;

    const c = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      width: A4_WIDTH,
      height: A4_HEIGHT,
      selection: false,
    });

    canvas.current = c;

    c.on('path:created', (e: any) => {
      if (isApplyingRemote.current) return;
      const id = uuidv4();
      const myAuthorId = optionsRef.current.mySocketId?.() || 'local';
      e.path.customId = id;
      e.path.authorId = myAuthorId;
      e.path.selectable = false;

      const activePageId = pagesRef.current[currentPageIndexRef.current].id;
      getMyHistory(activePageId).push(id);

      // Zapisz od razu do magazynu strony z authorId
      const activePage = pagesRef.current[currentPageIndexRef.current];
      activePage.objects[id] = {
        fabricJSON: e.path.toJSON([CUSTOM_ID_KEY, AUTHOR_ID_KEY]),
        authorId: myAuthorId,
      };

      optionsRef.current.onObjectAdded?.(activePageId, id, e.path.toJSON([CUSTOM_ID_KEY, AUTHOR_ID_KEY]));
    });

    c.on('mouse:move', (e: any) => {
      const pointer = c.getPointer(e.e);
      const activePageId = pagesRef.current[currentPageIndexRef.current].id;
      optionsRef.current.onCursorMove?.(activePageId, pointer.x, pointer.y);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    loadDataToCanvas(pagesRef.current[0].objects);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      c.dispose();
      canvas.current = null;
    };
  }, []);

  // --- COFANIE (UNDO) ---

  const undoRef = useRef<(() => void) | null>(null);

  const undo = useCallback(() => {
    const activePageId = pagesRef.current[currentPageIndexRef.current].id;
    const history = getMyHistory(activePageId);
    if (history.length === 0) return;

    const lastId = history.pop()!;

    if (canvas.current) {
      const obj = canvas.current.getObjects().find((o: any) => o.customId === lastId);
      if (obj) {
        canvas.current.remove(obj);
        canvas.current.renderAll();
      }
    }

    const page = pagesRef.current.find(p => p.id === activePageId);
    if (page) delete page.objects[lastId];

    optionsRef.current.onObjectRemoved?.(activePageId, lastId);
  }, []);

  useEffect(() => {
    undoRef.current = undo;
  }, [undo]);

  // --- WIDOCZNOŚĆ UŻYTKOWNIKA ---

  /**
   * Przełącza widoczność obiektów danego autora na aktywnej stronie.
   * hidden = true  → obiekt ukryty (opacity 0, nie renderowany)
   * hidden = false → przywrócony
   */
  const setUserVisibility = useCallback((authorId: string, visible: boolean) => {
    if (visible) {
      hiddenAuthors.current.delete(authorId);
    } else {
      hiddenAuthors.current.add(authorId);
    }
    setHiddenAuthorsState(new Set(hiddenAuthors.current));

    if (!canvas.current) return;

    // Przeładuj canvas z magazynu — NIE przez toJSON (gubi authorId),
    // magazyn pagesRef już ma poprawne authorId dla każdego obiektu.
    const activePageIdx = currentPageIndexRef.current;
    loadDataToCanvas(pagesRef.current[activePageIdx].objects);
  }, [loadDataToCanvas]);

  // --- ZARZĄDZANIE STRONAMI ---

  const switchToPage = useCallback((newIndex: number) => {
    if (!canvas.current || newIndex === currentPageIndex) return;
    // Zapisz aktualny stan canvasu DO magazynu (tylko widoczne obiekty nie wystarczą — musimy mieć też ukryte)
    // Obiekty na canvasie = widoczne. Niewidoczne zostały już zapisane przy poprzednim załadowaniu.
    // Aktualizujemy tylko te które są na canvasie (visible lub nie).
    canvas.current.getObjects().forEach((obj: any) => {
      if (obj.customId) {
        pagesRef.current[currentPageIndex].objects[obj.customId] = {
          fabricJSON: obj.toJSON([CUSTOM_ID_KEY, AUTHOR_ID_KEY]),
          authorId: obj.authorId || '',
        };
      }
    });

    setCurrentPageIndex(newIndex);
    loadDataToCanvas(pagesRef.current[newIndex].objects || {});
  }, [currentPageIndex, loadDataToCanvas]);

  const addPage = useCallback(() => {
    // Zapisz bieżącą stronę
    canvas.current?.getObjects().forEach((obj: any) => {
      if (obj.customId) {
        pagesRef.current[currentPageIndex].objects[obj.customId] = {
          fabricJSON: obj.toJSON([CUSTOM_ID_KEY, AUTHOR_ID_KEY]),
          authorId: obj.authorId || '',
        };
      }
    });

    const newPage: PageInfo = {
      id: uuidv4(),
      name: `Strona ${pagesRef.current.length + 1}`,
      objects: {},
    };

    pagesRef.current.push(newPage);
    setPagesState([...pagesRef.current]);
    switchToPage(pagesRef.current.length - 1);

    optionsRef.current.onPageAdded?.({ id: newPage.id, name: newPage.name });
  }, [currentPageIndex, switchToPage]);

  const deletePage = useCallback((index: number) => {
    if (pagesRef.current.length <= 1) return;

    const deletedPageId = pagesRef.current[index].id;
    myObjectsHistory.current.delete(deletedPageId);
    pagesRef.current.splice(index, 1);

    let nextIndex = currentPageIndex;
    if (nextIndex >= pagesRef.current.length) nextIndex = pagesRef.current.length - 1;

    setPagesState([...pagesRef.current]);
    setCurrentPageIndex(nextIndex);
    loadDataToCanvas(pagesRef.current[nextIndex].objects || {});

    optionsRef.current.onPageDeleted?.(deletedPageId);
  }, [currentPageIndex, loadDataToCanvas]);

  const renamePage = useCallback((index: number, newName: string) => {
    if (!newName.trim()) return;
    const pageId = pagesRef.current[index].id;
    pagesRef.current[index].name = newName;
    setPagesState([...pagesRef.current]);
    optionsRef.current.onPageRenamed?.(pageId, newName);
  }, []);

  // --- ZDALNE OPERACJE NA STRONACH ---

  const addRemotePage = useCallback((page: { id: string; name: string }) => {
    if (pagesRef.current.find(p => p.id === page.id)) return;
    pagesRef.current.push({ id: page.id, name: page.name, objects: {} });
    setPagesState([...pagesRef.current]);
  }, []);

  const deleteRemotePage = useCallback((pageId: string) => {
    const index = pagesRef.current.findIndex(p => p.id === pageId);
    if (index === -1) return;

    myObjectsHistory.current.delete(pageId);
    pagesRef.current.splice(index, 1);

    let nextIndex = currentPageIndexRef.current;
    if (nextIndex >= pagesRef.current.length) nextIndex = pagesRef.current.length - 1;

    setPagesState([...pagesRef.current]);
    setCurrentPageIndex(nextIndex);
    if (pagesRef.current[nextIndex]) {
      loadDataToCanvas(pagesRef.current[nextIndex].objects || {});
    }
  }, [loadDataToCanvas]);

  const renameRemotePage = useCallback((pageId: string, name: string) => {
    const page = pagesRef.current.find(p => p.id === pageId);
    if (page) {
      page.name = name;
      setPagesState([...pagesRef.current]);
    }
  }, []);

  // --- OBSŁUGA ZDARZEŃ ZDALNYCH (rysowanie) ---

  const applyRemoteObject = useCallback((pageId: string, objectId: string, fabricJSON: any, authorId: string) => {
    const page = pagesRef.current.find(p => p.id === pageId);
    if (page) {
      page.objects[objectId] = { fabricJSON, authorId };
    }

    if (pageId === pagesRef.current[currentPageIndexRef.current].id && canvas.current) {
      // Jeśli autor jest ukryty, nie renderuj na canvasie
      if (hiddenAuthors.current.has(authorId)) return;

      isApplyingRemote.current = true;
      (fabric.util.enlivenObjects as any)([fabricJSON], (enlivened: fabric.Object[]) => {
        const obj = enlivened[0];
        (obj as any).customId = objectId;
        (obj as any).authorId = authorId;
        obj.selectable = false;
        obj.evented = false;
        canvas.current?.add(obj);
        canvas.current?.renderAll();
        isApplyingRemote.current = false;
      }, 'fabric');
    }
  }, []);

  const removeRemoteObject = useCallback((pageId: string, objectId: string) => {
    const page = pagesRef.current.find(p => p.id === pageId);
    if (page) delete page.objects[objectId];

    if (pageId === pagesRef.current[currentPageIndexRef.current].id && canvas.current) {
      const obj = canvas.current.getObjects().find((o: any) => o.customId === objectId);
      if (obj) {
        canvas.current.remove(obj);
        canvas.current.renderAll();
      }
    }
  }, []);

  const clearPageObjects = useCallback((pageId: string) => {
    const page = pagesRef.current.find(p => p.id === pageId);
    if (page) page.objects = {};
    myObjectsHistory.current.set(pageId, []);

    if (pageId === pagesRef.current[currentPageIndexRef.current].id) {
      canvas.current?.clear();
      canvas.current?.setBackgroundColor('#ffffff', () => canvas.current?.renderAll());
    }
  }, []);

  // --- EKSPORT DO PDF (respektuje ukrytych autorów) ---

  const exportToPDF = useCallback(async () => {
    const { jsPDF } = await import('jspdf');

    // Zapisz aktualny stan bieżącej strony
    canvas.current?.getObjects().forEach((obj: any) => {
      if (obj.customId) {
        pagesRef.current[currentPageIndexRef.current].objects[obj.customId] = {
          fabricJSON: obj.toJSON([CUSTOM_ID_KEY, AUTHOR_ID_KEY]),
          authorId: obj.authorId || '',
        };
      }
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PDF_W = 210;
    const PDF_H = 297;

    for (let i = 0; i < pagesRef.current.length; i++) {
      const page = pagesRef.current[i];
      if (i > 0) pdf.addPage();

      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = A4_WIDTH;
      tmpCanvas.height = A4_HEIGHT;

      await new Promise<void>((resolve) => {
        const tmpFabric = new fabric.Canvas(tmpCanvas, {
          backgroundColor: '#ffffff',
          width: A4_WIDTH,
          height: A4_HEIGHT,
        });

        // Filtruj ukrytych autorów dla eksportu
        const visibleEntries = Object.entries(page.objects).filter(
          ([, v]) => !v.authorId || !hiddenAuthors.current.has(v.authorId)
        );

        if (visibleEntries.length === 0) {
          const dataUrl = tmpFabric.toDataURL({ format: 'jpeg', quality: 0.95 });
          pdf.addImage(dataUrl, 'JPEG', 0, 0, PDF_W, PDF_H);
          tmpFabric.dispose();
          resolve();
          return;
        }

        const fabricObjects = visibleEntries.map(([, v]) => v.fabricJSON);
        const ids = visibleEntries.map(([id]) => id);

        (fabric.util.enlivenObjects as any)(fabricObjects, (enlivened: fabric.Object[]) => {
          enlivened.forEach((obj, idx) => {
            (obj as any).customId = ids[idx];
            tmpFabric.add(obj);
          });
          tmpFabric.renderAll();
          const dataUrl = tmpFabric.toDataURL({ format: 'jpeg', quality: 0.95 });
          pdf.addImage(dataUrl, 'JPEG', 0, 0, PDF_W, PDF_H);
          tmpFabric.dispose();
          resolve();
        }, 'fabric');
      });
    }

    pdf.save('drafty-eksport.pdf');
  }, []);

  // --- EKSPORT METOD ---

  return {
    canvasRef,
    pages,
    currentPageIndex,
    currentColor,
    hiddenAuthors: hiddenAuthorsState,
    setUserVisibility,
    setTool: (t: Tool) => {
      if (canvas.current) {
        canvas.current.isDrawingMode = true;
        canvas.current.freeDrawingBrush.color = t === 'eraser' ? '#ffffff' : currentColor;
      }
    },
    setColor: (c: string) => {
      setCurrentColorState(c);
      if (canvas.current) canvas.current.freeDrawingBrush.color = c;
    },
    setBrushSize: (s: number) => {
      if (canvas.current) canvas.current.freeDrawingBrush.width = s;
    },
    clearCanvas: () => {
      const activePageId = pagesRef.current[currentPageIndexRef.current].id;
      // Wyczyść magazyn strony — bez tego toggle widoczności przywracałby "duchy"
      const activePage = pagesRef.current[currentPageIndexRef.current];
      if (activePage) activePage.objects = {};
      myObjectsHistory.current.set(activePageId, []);
      canvas.current?.clear();
      canvas.current?.setBackgroundColor('#ffffff', () => canvas.current?.renderAll());
    },
    undo,
    exportToPDF,
    addPage,
    switchToPage,
    deletePage,
    renamePage,
    addRemotePage,
    deleteRemotePage,
    renameRemotePage,
    applyRemoteObject,
    removeRemoteObject,
    clearPageObjects,
    getCurrentPageId: () => pagesRef.current[currentPageIndex].id,
    loadCanvasState: (allState: any, serverPages?: Array<{ id: string; name: string }>) => {
      let newPages: PageInfo[];

      if (serverPages && serverPages.length > 0) {
        newPages = serverPages.map(p => {
          const pageObjects = allState[p.id] || {};
          // Normalizuj format — serwer może przysłać stary format (bez authorId)
          const normalized: Record<string, { fabricJSON: any; authorId: string }> = {};
          for (const [objId, val] of Object.entries(pageObjects)) {
            if (val && typeof val === 'object' && 'fabricJSON' in (val as any)) {
              normalized[objId] = val as { fabricJSON: any; authorId: string };
            } else {
              // Stary format: fabricJSON bezpośrednio
              normalized[objId] = { fabricJSON: val, authorId: '' };
            }
          }
          return { id: p.id, name: p.name, objects: normalized };
        });
      } else {
        newPages = Object.keys(allState).map((pid, idx) => {
          const pageObjects = allState[pid];
          const normalized: Record<string, { fabricJSON: any; authorId: string }> = {};
          for (const [objId, val] of Object.entries(pageObjects)) {
            if (val && typeof val === 'object' && 'fabricJSON' in (val as any)) {
              normalized[objId] = val as { fabricJSON: any; authorId: string };
            } else {
              normalized[objId] = { fabricJSON: val, authorId: '' };
            }
          }
          return { id: pid, name: `Strona ${idx + 1}`, objects: normalized };
        });
      }

      if (newPages.length > 0) {
        pagesRef.current = newPages;
        setPagesState([...pagesRef.current]);
        setCurrentPageIndex(0);
        loadDataToCanvas(pagesRef.current[0].objects);
      }
    },
  };
}
