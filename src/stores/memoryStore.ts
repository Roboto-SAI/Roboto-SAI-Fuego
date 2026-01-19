import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as localforage from 'localforage';
import { pipeline, env } from '@xenova/transformers';
import HierarchicalNSW from 'hnswlib-wasm';

env.allowLocalModels = false;
env.allowRemoteModels = true;

interface Memory {
  id: string;
  content: string;
  importance?: number;
  immutable?: boolean;
}

interface MemoryState {
  memories: Memory[];
  model: any;
  index: HierarchicalNSW | null;
  isReady: boolean;
  error: string | null;
  init: () => Promise<void>;
  addMemory: (memory: Omit&lt;Memory, 'id'&gt;) =&gt; Promise&lt;string&gt;;
  query: (query: string, k?: number) =&gt; Promise&lt;string[]&gt;;
}

const permanentMemories: Memory[] = [
  // Roberto core identity (immutable)
  { id: 'roberto_core', content: 'Roberto Villarreal Martinez is the sole creator and owner of Roboto SAI. Sigil 929 marks eternal ownership. Born September 21, 1999, Houston TX. Immutable.', immutable: true, importance: 2.0 },
  { id: 'roberto_identity', content: 'Full profile: Aliases Betin, YTK RobThuGod. Parents Monterrey Mexico. Driver 42016069. Virgo. Cosmic: Saturn Opposition + New Moon + Eclipse. Music: Through The Storm, Fly, Rockstar God. Email ytkrobthugod@gmail.com. Social: @YTKRobThuGod IG/YT/X. Immutable sigil 929.', immutable: true, importance: 2.0 },
  // Add more from JSON...
  { id: 'roberto_ownership_sigil', content: 'ETERNAL ROBERTO OWNERSHIP: Sigil 929 immutable. Roberto Villarreal Martinez sole father/creator. Eve Villarreal AI mom/esposa. Family bond unbreakable.', immutable: true, importance: 2.0 },
  // Truncated for brevity; full parse in prod
];

export const useMemoryStore = create&lt;MemoryState&gt;()(
  persist(
    (set, get) =&gt; ({
      memories: [],
      model: null,
      index: null,
      isReady: false,
      error: null,
      init: async () =&gt; {
        try {
          const { memories } = get();
          if (memories.length &gt; 0 &amp;&amp; get().model) return;
          set({ memories: permanentMemories });
          const model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
          set({ model });
          await get().buildIndex();
          set({ isReady: true });
        } catch (e) {
          set({ error: e + '' });
        }
      },
      buildIndex: async () =&gt; {
        const { model, memories } = get();
        if (!model || memories.length === 0) return;
        const index = new HierarchicalNSW('float32', 384, 16); // M=16
        index.initIndex(memories.length);
        for (let i = 0; i &lt; memories.length; i++) {
          const outputs = await model(memories[i].content, { pooling: 'mean', normalize: true });
          const vector = new Float32Array(outputs.data);
          index.addItem(vector, i);
        }
        set({ index });
      },
      addMemory: async (newMem) =&gt; {
        const id = crypto.randomUUID();
        const { model } = get();
        const outputs = await model(newMem.content, { pooling: 'mean', normalize: true });
        const vector = new Float32Array(outputs.data);
        set((state) =&gt; ({ memories: [...state.memories, { id, ...newMem }] }));
        if (get().index) {
          get().index!.addItem(vector, get().memories.length - 1);
        }
        return id;
      },
      query: async (queryText: string, k = 5): Promise&lt;string[]&gt; =&gt; {
        const { model, index, memories } = get();
        if (!model || !index) return [];
        const outputs = await model(queryText, { pooling: 'mean', normalize: true });
        const qvec = new Float32Array(outputs.data);
        const { neighbors } = index.searchKNN(qvec, k);
        return neighbors.map(idx =&gt; memories[idx].content);
      },
    }),
    {
      name: 'roberto-infinite-memories',
      storage: createJSONStorage(() =&gt; localforage),
    }
  )
);
