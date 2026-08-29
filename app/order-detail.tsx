import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveMediaUrl } from '@/constants/api';
import { getManufacturing, saveManufacturing, type ManufacturingData } from '@/lib/manufacturing';
import type { UiOrder } from '@/lib/orders';
import {
  enqueue,
  getQueueForOrder,
  processQueue,
  type QueueItem,
  type StageKey,
} from '@/lib/upload-queue';
import { getUploadError } from '@/lib/upload-queue';
import { getMetaMap, setMeta, formatWhen, type ImageMeta } from '@/lib/image-meta';

const BLUE = '#3E82C4';
const AMOUNT_BLUE = '#3E82C4';
const LIGHT_BLUE_BG = '#e8f2fb';
const YELLOW = '#f6c918';
const BORDER = '#ececf0';
const MUTED = '#8a929b';
const DARK = '#3b4149';

const TABS = ['Row material', 'Manufacturing Started', 'Packing', 'Documentation'];
const SECTION_TITLES = [
  'First product manufacture',
  'Manufacturing started',
  'Product packing',
  'Documentation upload',
];
const STAGE_KEYS: StageKey[] = ['rawMaterial', 'manufacturing', 'packing', 'documentation'];
const CARGO_TYPES = ['Box', 'Pallet', 'Container'];

const stageHasData = (arr?: string[]) => Array.isArray(arr) && arr.length > 0;
// The tab the order should OPEN on = its current stage: the first step with no
// media yet. If every step has media, manufacturing is complete → the last tab.
const currentStageTab = (d: Pick<ManufacturingData, StageKey>) => {
  for (let i = 0; i < STAGE_KEYS.length; i += 1) {
    if (!stageHasData(d[STAGE_KEYS[i]])) return i;
  }
  return STAGE_KEYS.length - 1;
};

type StageImages = Pick<ManufacturingData, StageKey>;
type Capture = { id: string; stage: StageKey; localUri: string; name: string; status: 'pending' | 'uploading' | 'done'; meta?: ImageMeta };

const fileName = (url: string) => {
  try {
    return decodeURIComponent(url.split('?')[0].split('/').pop() || 'document');
  } catch {
    return 'document';
  }
};

const VIDEO_RE = /\.(mp4|mov|m4v|webm|avi|mkv|3gp)(\?|$)/i;
const isVideo = (s?: string) => !!s && VIDEO_RE.test(s.split('?')[0]);
const IMAGE_RE = /\.(jpe?g|png|webp|gif|heic|heif|bmp)(\?|$)/i;
const isImageFile = (s?: string) => !!s && IMAGE_RE.test(s.split('?')[0]);
const isPdfFile = (s?: string) => !!s && /\.pdf(\?|$)/i.test(s.split('?')[0]);

/**
 * Video preview: renders the actual video (so it always shows a real frame, no
 * flaky thumbnail generation) and gives it a "minor auto-start" — plays muted for
 * ~2s when it appears, then pauses on a frame. A ▶ badge shows once it's paused.
 */
function VideoThumb({ uri, children }: { uri: string; children?: React.ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = false;
  });
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
      player.play();
      setPlaying(true);
      // Minor 2-second auto-preview, then freeze on a frame.
      t = setTimeout(() => {
        try {
          player.pause();
        } catch {
          // ignore
        }
        setPlaying(false);
      }, 2000);
    } catch {
      setPlaying(false);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [player]);
  return (
    <View>
      <View style={[styles.mediaThumb, styles.videoClip]}>
        <VideoView
          player={player}
          style={styles.videoFill}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
        />
      </View>
      {!playing ? (
        <View style={styles.playOverlay}>
          <Ionicons name="play" size={18} color="#ffffff" />
        </View>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Full-screen viewer opened when a thumbnail is tapped. Shows a photo (fit to
 * screen) or plays a video with full controls. Rendered only while open, so the
 * video player hook is active only then.
 */
function MediaViewer({ uri, isVideo, onClose }: { uri: string; isVideo: boolean; onClose: () => void }) {
  const player = useVideoPlayer(isVideo ? uri : null, (p) => {
    p.loop = false;
  });
  useEffect(() => {
    if (isVideo) {
      try {
        player.play();
      } catch {
        // ignore
      }
    }
  }, [isVideo, player]);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewerBackdrop}>
        <TouchableOpacity style={styles.viewerClose} onPress={onClose} activeOpacity={0.8} hitSlop={10}>
          <Ionicons name="close" size={30} color="#ffffff" />
        </TouchableOpacity>
        {isVideo ? (
          <VideoView player={player} style={styles.viewerMedia} contentFit="contain" nativeControls allowsFullscreen />
        ) : (
          <Image source={{ uri }} style={styles.viewerMedia} resizeMode="contain" />
        )}
      </View>
    </Modal>
  );
}

// First-page PDF thumbnails, cached per URL for the session.
const pdfThumbCache = new Map<string, string>();

/**
 * Render a PDF's first page as an image thumbnail. Expo Go has no native PDF
 * renderer, so we run pdf.js in a tiny hidden WebView, draw page 1 to a canvas,
 * and post the JPEG data URL back. Falls back to a document icon if it can't
 * render (e.g. no internet for the pdf.js CDN). Cached so it renders once.
 */
function PdfThumb({ url, style }: { url: string; style: any }) {
  const [img, setImg] = useState<string | null>(() => pdfThumbCache.get(url) ?? null);
  const [failed, setFailed] = useState(false);
  const html = useMemo(
    () =>
      `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
function post(m){try{window.ReactNativeWebView.postMessage(m);}catch(e){}}
try{
 pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 pdfjsLib.getDocument({url:${JSON.stringify(url)}}).promise
 .then(function(pdf){return pdf.getPage(1);})
 .then(function(page){
   var s=240/page.getViewport({scale:1}).width;
   var vp=page.getViewport({scale:s});
   var c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
   return page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(function(){
     post(c.toDataURL('image/jpeg',0.7));
   });
 }).catch(function(e){post('ERR:'+(e&&e.message));});
}catch(e){post('ERR:'+(e&&e.message));}
</script></body></html>`,
    [url],
  );
  return (
    <View style={style}>
      {img ? (
        <Image source={{ uri: img }} style={[StyleSheet.absoluteFill, { borderRadius: 6 }]} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.videoPlaceholder, { borderRadius: 6 }]}>
          <Ionicons name="document-text" size={18} color="#ffffff" />
        </View>
      )}
      {!img && !failed ? (
        <WebView
          source={{ html }}
          style={styles.pdfHiddenWeb}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={(e) => {
            const d = e.nativeEvent.data;
            if (d && d.startsWith('data:')) {
              pdfThumbCache.set(url, d);
              setImg(d);
            } else {
              setFailed(true);
            }
          }}
        />
      ) : null}
    </View>
  );
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ order?: string }>();

  const order = useMemo<UiOrder | null>(() => {
    try {
      return params.order ? (JSON.parse(params.order) as UiOrder) : null;
    } catch {
      return null;
    }
  }, [params.order]);

  const orderId = order?.id;
  const [activeTab, setActiveTab] = useState(0);
  const [qty, setQty] = useState<string[]>(() => TABS.map(() => '1'));
  const [notes, setNotes] = useState<string[]>(() => TABS.map(() => ''));

  // Packing details (one box, like the website)
  const [cargoType, setCargoType] = useState('Box');
  const [packingQty, setPackingQty] = useState('25');
  const [box, setBox] = useState({ length: '100', width: '100', height: '100', weight: '1', quantity: '1' });

  const setQtyForTab = (v: string) => setQty((prev) => prev.map((x, i) => (i === activeTab ? v : x)));
  const setNotesForTab = (v: string) =>
    setNotes((prev) => prev.map((x, i) => (i === activeTab ? v : x)));
  const setBoxField = (k: keyof typeof box, v: string) => setBox((prev) => ({ ...prev, [k]: v }));

  const [images, setImages] = useState<StageImages>({
    rawMaterial: [],
    manufacturing: [],
    packing: [],
    documentation: [],
  });
  const [captured, setCaptured] = useState<Capture[]>([]);
  const [loadingMfg, setLoadingMfg] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Date/time/location stamp for each image, keyed by local URI and by uploaded URL.
  const [metaMap, setMetaMap] = useState<Record<string, ImageMeta>>({});
  // Full-screen media viewer (tap a thumbnail to open).
  const [viewer, setViewer] = useState<{ uri: string; isVideo: boolean } | null>(null);

  // Tab-change animation
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;
  // Open the order on its current stage's tab, only once per load.
  const didInitTab = useRef(false);
  useEffect(() => {
    fade.setValue(0);
    slide.setValue(14);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [activeTab, fade, slide]);

  const syncNow = useCallback(async () => {
    setCaptured((prev) => prev.map((c) => (c.status === 'pending' ? { ...c, status: 'uploading' } : c)));
    const res = await processQueue();
    if (!orderId) return;
    const remaining = await getQueueForOrder(orderId);
    const remIds = new Set(remaining.map((i) => i.id));
    setCaptured((prev) =>
      prev.map((c) => (remIds.has(c.id) ? { ...c, status: 'pending' } : { ...c, status: 'done' })),
    );
    // Show the REAL reason when something is still stuck, so it's never a silent "waiting".
    setSyncError(remaining.length > 0 ? res.error || getUploadError() : null);
    // Refresh the stamp map so freshly uploaded URLs show their date/time/location.
    setMetaMap(await getMetaMap());
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      setLoadingMfg(true);
      const [res, q] = await Promise.all([getManufacturing(orderId), getQueueForOrder(orderId)]);
      if (cancelled) return;
      if (res.ok) {
        setQty(TABS.map(() => String(res.data.quantity ?? 1)));
        setNotes(TABS.map(() => res.data.notes ?? ''));
        setImages({
          rawMaterial: res.data.rawMaterial,
          manufacturing: res.data.manufacturing,
          packing: res.data.packing,
          documentation: res.data.documentation,
        });
        setCargoType(res.data.cargoType || 'Box');
        setPackingQty(String(res.data.packingQuantity ?? 25));
        setBox({
          length: String(res.data.boxDetails.length),
          width: String(res.data.boxDetails.width),
          height: String(res.data.boxDetails.height),
          weight: String(res.data.boxDetails.weight),
          quantity: String(res.data.boxDetails.quantity),
        });
        // Jump to the stage this order is actually on (so a partly/fully done
        // order never reopens back at the first "Row material" step).
        if (!didInitTab.current) {
          setActiveTab(currentStageTab(res.data));
          didInitTab.current = true;
        }
      }
      setCaptured(
        q.map((i) => ({ id: i.id, stage: i.stage, localUri: i.localUri, name: i.name, status: 'pending' as const })),
      );
      setMetaMap(await getMetaMap());
      setLoadingMfg(false);
      syncNow();
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, syncNow]);

  useEffect(() => {
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncNow();
    });
    const netSub = Network.addNetworkStateListener((e) => {
      if (e.isConnected && e.isInternetReachable !== false) syncNow();
    });
    return () => {
      appSub.remove();
      netSub.remove();
    };
  }, [syncNow]);

  // Save quantity + notes + packing details without disturbing saved images.
  const persistFields = async () => {
    if (!orderId) return;
    const cur = await getManufacturing(orderId);
    if (!cur.ok) return;
    await saveManufacturing(orderId, {
      ...cur.data,
      quantity: Number(qty[activeTab]) || 0,
      notes: notes[activeTab] || '',
      packingQuantity: Number(packingQty) || 0,
      cargoType,
      boxDetails: {
        length: Number(box.length) || 0,
        width: Number(box.width) || 0,
        height: Number(box.height) || 0,
        weight: Number(box.weight) || 0,
        quantity: Number(box.quantity) || 0,
      },
    });
  };

  const enqueueMedia = async (stage: StageKey, uri: string, name: string, type: string, meta?: ImageMeta) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const item: QueueItem = { id, orderId: orderId!, stage, localUri: uri, name, type, createdAt: Date.now() };
    await enqueue(item);
    setCaptured((prev) => [...prev, { id, stage, localUri: uri, name, status: 'pending', meta }]);
    syncNow();
  };

  // Read the current date/time + GPS location (reverse-geocoded to a place name)
  // to stamp on the photo. Fails soft: always returns at least the timestamp.
  const captureLocationMeta = async (): Promise<ImageMeta> => {
    const meta: ImageMeta = { at: Date.now() };
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        meta.lat = pos.coords.latitude;
        meta.lng = pos.coords.longitude;
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude: meta.lat, longitude: meta.lng });
          const g = geo?.[0];
          if (g) {
            meta.place =
              [g.city || g.district || g.subregion || g.name, g.region].filter(Boolean).join(', ') || undefined;
          }
        } catch {
          // reverse-geocode unavailable → keep raw coords only
        }
      }
    } catch {
      // location unavailable/denied → timestamp only
    }
    return meta;
  };

  const captureAndQueue = async (mediaType: 'images' | 'videos') => {
    if (!orderId) {
      Alert.alert('Not available', 'Open a real order to add photos.');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Please allow camera access to add photos/videos.');
      return;
    }
    const isVideo = mediaType === 'videos';
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: isVideo ? ['videos'] : ['images'],
      allowsEditing: false,
      quality: 0.6,
      cameraType: ImagePicker.CameraType.back,
      // Keep videos small enough for the server's upload limit (~15MB) by
      // capping the clip length (cross-platform).
      ...(isVideo ? { videoMaxDuration: 20 } : {}),
    });
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    // Stamp the capture with date/time + location (images and videos alike).
    const meta = await captureLocationMeta();
    await setMeta(a.uri, meta);
    setMetaMap((prev) => ({ ...prev, [a.uri]: meta }));
    // ALWAYS a unique filename. The media service treats same-name+size as a
    // duplicate ("already uploaded") — reusing the camera's filename made a
    // fresh photo look like a re-upload, so it was auto-rejected.
    const ext = (a.fileName?.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase();
    const uniqueName = `${isVideo ? 'video' : 'photo'}_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
    await enqueueMedia(
      STAGE_KEYS[activeTab],
      a.uri,
      uniqueName,
      a.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      meta,
    );
  };

  const pickDocument = async () => {
    if (!orderId) {
      Alert.alert('Not available', 'Open a real order to add documents.');
      return;
    }
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    // Keep the readable name but make it unique (dup check is name+size).
    const raw = a.name || 'document';
    const dot = raw.lastIndexOf('.');
    const base = dot > 0 ? raw.slice(0, dot) : raw;
    const dext = dot > 0 ? raw.slice(dot) : '';
    const docName = `${base}_${Date.now()}${dext}`;
    await enqueueMedia('documentation', a.uri, docName, a.mimeType || 'application/octet-stream');
  };

  // A stage is "complete" once it has at least one saved or captured file.
  const stageHasMedia = (i: number) => {
    const key = STAGE_KEYS[i];
    return (images[key]?.length ?? 0) > 0 || captured.some((c) => c.stage === key);
  };

  const goToTab = (i: number) => {
    if (i > activeTab && !stageHasMedia(activeTab)) {
      Alert.alert(
        'Add a file first',
        activeTab === 3
          ? 'Please upload at least one document before continuing.'
          : 'Please add at least one photo/video for this step before continuing.',
      );
      return;
    }
    setActiveTab(i);
  };

  const stageKey = STAGE_KEYS[activeTab];
  const isDoc = stageKey === 'documentation';
  const isPacking = stageKey === 'packing';
  const stageRemote = images[stageKey] || [];
  const stageCaptured = captured.filter((c) => c.stage === stageKey);
  // Order is complete when every step has media → show it view-only (no fill form).
  const readOnly = STAGE_KEYS.every((k) => (images[k]?.length ?? 0) > 0);
  const pendingCount = captured.filter((c) => c.status === 'pending').length;

  const statusIcon = (status: Capture['status']) =>
    status === 'uploading' ? (
      <ActivityIndicator size="small" color="#ffffff" />
    ) : status === 'pending' ? (
      <Ionicons name="cloud-offline-outline" size={14} color="#ffffff" />
    ) : (
      <Ionicons name="checkmark-circle" size={16} color="#3ddc84" />
    );

  // Date/time/location stamp shown under each photo.
  const renderStamp = (m?: ImageMeta) => {
    if (!m) return null;
    const loc = m.place || (m.lat != null && m.lng != null ? `${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}` : null);
    return (
      <View style={styles.stamp}>
        <View style={styles.stampRow}>
          <Ionicons name="time-outline" size={10} color="#5b6b7b" />
          <Text style={styles.stampText} numberOfLines={1}>
            {formatWhen(m.at)}
          </Text>
        </View>
        <View style={styles.stampRow}>
          <Ionicons name="location-outline" size={10} color={loc ? '#5b6b7b' : '#9aa7b4'} />
          <Text style={[styles.stampText, !loc && { color: '#9aa7b4' }]} numberOfLines={2}>
            {loc || 'Location off'}
          </Text>
        </View>
      </View>
    );
  };

  // Open an uploaded document: images go to the in-app full-screen viewer; PDFs
  // and other files open in the phone's browser/viewer (Chrome renders PDFs).
  const openDoc = async (uri: string) => {
    if (isImageFile(uri)) {
      setViewer({ uri, isVideo: false });
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(uri);
    } catch {
      try {
        await Linking.openURL(uri);
      } catch {
        Alert.alert('Cannot open', 'This document could not be opened on your device.');
      }
    }
  };

  // Completed order → one view showing everything that was submitted (no tabs,
  // no form). Photos/videos from the 3 build steps, documents from the last.
  const renderCompleted = () => {
    const photos = [...images.rawMaterial, ...images.manufacturing, ...images.packing];
    const docs = images.documentation;
    return (
      <View style={styles.tabContent}>
        <View style={styles.completedHead}>
          <Ionicons name="checkmark-circle" size={22} color="#1a8f5f" />
          <Text style={styles.completedTitle}>Manufacturing Completed</Text>
        </View>

        {photos.length > 0 ? (
          <>
            <Text style={styles.label}>Photos & Videos ({photos.length})</Text>
            <View style={styles.mediaGrid}>
              {photos.map((uri, idx) => {
                const src = resolveMediaUrl(uri);
                const vid = isVideo(uri);
                const m = metaMap[uri];
                return (
                  <View key={`p-${idx}`} style={styles.gridItem}>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setViewer({ uri: src, isVideo: vid })}>
                      {vid ? <VideoThumb uri={src} /> : <Image source={{ uri: src }} style={styles.mediaThumb} />}
                    </TouchableOpacity>
                    {m ? renderStamp(m) : null}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {docs.length > 0 ? (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>Documents ({docs.length})</Text>
            <View style={styles.docList}>
              {docs.map((url, i) => {
                const src = resolveMediaUrl(url);
                const img = isImageFile(url);
                const pdf = isPdfFile(url);
                return (
                  <TouchableOpacity key={`d-${i}`} style={styles.docRow} activeOpacity={0.8} onPress={() => openDoc(src)}>
                    {img ? (
                      <Image source={{ uri: src }} style={styles.docThumb} />
                    ) : pdf ? (
                      <PdfThumb url={src} style={styles.docThumb} />
                    ) : (
                      <Ionicons name="document-text-outline" size={26} color={BLUE} />
                    )}
                    <Text style={styles.docName} numberOfLines={1}>
                      {fileName(url)}
                    </Text>
                    <Ionicons name="eye-outline" size={18} color={MUTED} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {order ? (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.thumb}>
                <Ionicons name="image-outline" size={24} color="#b7c0c9" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.orderNo}>Order No. {order.orderNo}</Text>
                {order.sampleLabel ? <Text style={styles.metaLine}>{order.sampleLabel}</Text> : null}
                <Text style={styles.product} numberOfLines={2}>
                  {order.product}
                </Text>
              </View>
              <Ionicons name="document-text-outline" size={22} color={DARK} />
            </View>
            <View style={styles.cardMid}>
              {order.qty ? <Text style={styles.metaLine}>Qty.: {order.qty} Pcs.</Text> : null}
              <Text style={styles.metaLine}>Order Date: {order.orderDate}</Text>
              <Text style={styles.metaLine}>Complition Date: {order.completionDate}</Text>
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.amounts}>
                <View>
                  <Text style={styles.amountLabel}>Order Amount</Text>
                  <Text style={styles.amountValue}>{order.orderAmount}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Advance Received</Text>
                  <Text style={styles.amountValue}>{order.advanceReceived}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {readOnly && !loadingMfg ? (
          renderCompleted()
        ) : (
          <>
        {/* Stage tabs */}
        <View style={styles.tabsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {TABS.map((t, i) => (
              <TouchableOpacity key={t} onPress={() => goToTab(i)} style={styles.tabItem} activeOpacity={0.7}>
                <Text style={[styles.tabLabel, i === activeTab && styles.tabLabelActive]}>{t}</Text>
                <View style={[styles.tabUnderline, i === activeTab && styles.tabUnderlineActive]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Animated.View style={[styles.tabContent, { opacity: fade, transform: [{ translateX: slide }] }]}>
          <Text style={styles.sectionTitle}>{SECTION_TITLES[activeTab]}</Text>

          {loadingMfg ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={BLUE} />
              <Text style={styles.loadingText}>Loading saved data…</Text>
            </View>
          ) : null}

          {/* Media buttons: hidden once the order is complete (view-only). */}
          {readOnly ? null : isDoc ? (
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.85} onPress={pickDocument}>
                <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                <Text style={styles.uploadBtnText}>Upload Documents</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.lightBtn} activeOpacity={0.8} onPress={() => captureAndQueue('videos')}>
                <Text style={styles.lightBtnText}>Start Video(3D)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.lightBtn} activeOpacity={0.8} onPress={() => captureAndQueue('images')}>
                <Text style={styles.lightBtnText}>Take Photos</Text>
              </TouchableOpacity>
            </View>
          )}

          {pendingCount > 0 ? (
            syncError ? (
              <TouchableOpacity style={styles.errorBanner} activeOpacity={0.8} onPress={syncNow}>
                <Ionicons name="alert-circle-outline" size={16} color="#c0341d" />
                <Text style={styles.errorText}>
                  Couldn&apos;t upload: {syncError}  ·  Tap to retry
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.offlineBanner} activeOpacity={0.8} onPress={syncNow}>
                <Ionicons name="cloud-offline-outline" size={16} color="#b06a00" />
                <Text style={styles.offlineText}>
                  {pendingCount} item{pendingCount > 1 ? 's' : ''} waiting — will upload automatically when you&apos;re online. Tap to retry now.
                </Text>
              </TouchableOpacity>
            )
          ) : null}

          {/* Previews: document rows on Documentation, image thumbnails otherwise */}
          {isDoc ? (
            <View style={styles.docList}>
              {stageRemote.map((url, i) => {
                const src = resolveMediaUrl(url);
                const img = isImageFile(url);
                const pdf = isPdfFile(url);
                return (
                  <TouchableOpacity key={`rd-${i}`} style={styles.docRow} activeOpacity={0.8} onPress={() => openDoc(src)}>
                    {img ? (
                      <Image source={{ uri: src }} style={styles.docThumb} />
                    ) : pdf ? (
                      <PdfThumb url={src} style={styles.docThumb} />
                    ) : (
                      <Ionicons name="document-text-outline" size={26} color={BLUE} />
                    )}
                    <Text style={styles.docName} numberOfLines={1}>
                      {fileName(url)}
                    </Text>
                    <Ionicons name="eye-outline" size={18} color={MUTED} />
                  </TouchableOpacity>
                );
              })}
              {stageCaptured.map((c) => {
                const img = isImageFile(c.name || c.localUri);
                const pdf = isPdfFile(c.name || c.localUri);
                return (
                  <TouchableOpacity key={c.id} style={styles.docRow} activeOpacity={0.8} onPress={() => openDoc(c.localUri)}>
                    {img ? (
                      <Image source={{ uri: c.localUri }} style={styles.docThumb} />
                    ) : (
                      <Ionicons name={pdf ? 'document-text' : 'document-text-outline'} size={26} color={pdf ? '#d9463e' : BLUE} />
                    )}
                    <Text style={styles.docName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    {c.status === 'uploading' ? (
                      <ActivityIndicator size="small" color={BLUE} />
                    ) : c.status === 'pending' ? (
                      <Ionicons name="cloud-offline-outline" size={18} color="#b06a00" />
                    ) : (
                      <Ionicons name="checkmark-circle" size={18} color="#22b07d" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : stageRemote.length > 0 || stageCaptured.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip}>
              {stageRemote.map((uri, idx) => {
                const m = metaMap[uri];
                const src = resolveMediaUrl(uri);
                const vid = isVideo(uri);
                return (
                  <View key={`r-${idx}`} style={styles.thumbWrap}>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setViewer({ uri: src, isVideo: vid })}>
                      {vid ? <VideoThumb uri={src} /> : <Image source={{ uri: src }} style={styles.mediaThumb} />}
                    </TouchableOpacity>
                    {m ? renderStamp(m) : null}
                  </View>
                );
              })}
              {stageCaptured.map((c) => {
                const vid = isVideo(c.name || c.localUri);
                return (
                  <View key={c.id} style={styles.thumbWrap}>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setViewer({ uri: c.localUri, isVideo: vid })}>
                      {vid ? (
                        <VideoThumb uri={c.localUri}>
                          <View style={styles.thumbBadge}>{statusIcon(c.status)}</View>
                        </VideoThumb>
                      ) : (
                        <View>
                          <Image source={{ uri: c.localUri }} style={styles.mediaThumb} />
                          <View style={styles.thumbBadge}>{statusIcon(c.status)}</View>
                        </View>
                      )}
                    </TouchableOpacity>
                    {renderStamp(c.meta ?? metaMap[c.localUri])}
                  </View>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Quantity + Notes (all tabs) */}
          <Text style={styles.label}>Quantity Manufacture</Text>
          <TextInput
            style={styles.input}
            value={qty[activeTab]}
            onChangeText={setQtyForTab}
            onBlur={persistFields}
            keyboardType="number-pad"
            editable={!readOnly}
          />

          <Text style={styles.label}>Notes:</Text>
          <TextInput
            style={styles.textarea}
            value={notes[activeTab]}
            onChangeText={setNotesForTab}
            onBlur={persistFields}
            multiline
            textAlignVertical="top"
            placeholder="enter your notes here..."
            placeholderTextColor="#9aa2ab"
            editable={!readOnly}
          />

          {/* Packing box details (Packing tab only) */}
          {isPacking ? (
            <View style={styles.packingWrap}>
              <Text style={styles.label}>Quantity:</Text>
              <TextInput
                style={styles.input}
                value={packingQty}
                onChangeText={setPackingQty}
                onBlur={persistFields}
                keyboardType="number-pad"
                editable={!readOnly}
              />

              <Text style={styles.stepLabel}>1. Select cargo Type</Text>
              <View style={styles.cargoRow}>
                {CARGO_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.cargoPill, cargoType === t && styles.cargoPillActive]}
                    disabled={readOnly}
                    onPress={() => {
                      setCargoType(t);
                      persistFields();
                    }}
                    activeOpacity={0.8}>
                    <Text style={[styles.cargoPillText, cargoType === t && styles.cargoPillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.boxCard}>
                <Text style={styles.boxTitle}>Box 1</Text>
                <View style={styles.boxGrid}>
                  <BoxInput label="Length" suffix="mm" value={box.length} onChange={(v) => setBoxField('length', v)} onBlur={persistFields} editable={!readOnly} />
                  <BoxInput label="Width" suffix="mm" value={box.width} onChange={(v) => setBoxField('width', v)} onBlur={persistFields} editable={!readOnly} />
                  <BoxInput label="Height" suffix="mm" value={box.height} onChange={(v) => setBoxField('height', v)} onBlur={persistFields} editable={!readOnly} />
                  <BoxInput label="Weight" suffix="Kg" value={box.weight} onChange={(v) => setBoxField('weight', v)} onBlur={persistFields} editable={!readOnly} />
                  <BoxInput label="Quantity" value={box.quantity} onChange={(v) => setBoxField('quantity', v)} onBlur={persistFields} editable={!readOnly} />
                </View>
              </View>
            </View>
          ) : null}

          {/* Next / validation */}
          <TouchableOpacity
            style={styles.nextBtn}
            activeOpacity={0.85}
            onPress={() => (activeTab < TABS.length - 1 ? goToTab(activeTab + 1) : router.back())}>
            <Text style={styles.nextBtnText}>{activeTab < TABS.length - 1 ? 'Next' : 'Done'}</Text>
            <Ionicons name={activeTab < TABS.length - 1 ? 'chevron-forward' : 'checkmark'} size={16} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
          </>
        )}
      </ScrollView>
      {viewer ? (
        <MediaViewer uri={viewer.uri} isVideo={viewer.isVideo} onClose={() => setViewer(null)} />
      ) : null}
    </SafeAreaView>
  );
}

function BoxInput({
  label,
  value,
  suffix,
  onChange,
  onBlur,
  editable = true,
}: {
  label: string;
  value: string;
  suffix?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  editable?: boolean;
}) {
  return (
    <View style={styles.boxField}>
      <Text style={styles.boxFieldLabel}>{label}</Text>
      <View style={styles.boxInputWrap}>
        <TextInput
          style={styles.boxInput}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          keyboardType="numeric"
          editable={editable}
        />
        {suffix ? <Text style={styles.boxSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  topbar: { height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 12, paddingBottom: 40 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  thumb: { width: 62, height: 62, borderRadius: 8, backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1, paddingRight: 8 },
  orderNo: { fontSize: 13.5, fontWeight: '600', color: DARK },
  metaLine: { fontSize: 13, color: '#5c636b', marginTop: 3 },
  product: { fontSize: 13, color: '#5c636b', marginTop: 4, lineHeight: 18 },
  cardMid: { marginTop: 12 },
  cardBottom: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  amounts: { flexDirection: 'row', flex: 1, gap: 18 },
  amountLabel: { fontSize: 12.5, color: DARK, marginBottom: 4 },
  amountValue: { fontSize: 13, color: AMOUNT_BLUE, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plusBtn: { width: 46, height: 46, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#c7cdd4', alignItems: 'center', justifyContent: 'center' },
  supportBtn: { width: 46, height: 46, borderRadius: 8, backgroundColor: YELLOW, alignItems: 'center', justifyContent: 'center' },

  tabsBar: { marginTop: 6, borderBottomWidth: 1, borderBottomColor: '#eceef1' },
  tabsRow: { paddingHorizontal: 4, gap: 22 },
  tabItem: { paddingVertical: 12, alignItems: 'center' },
  tabLabel: { fontSize: 14, color: '#9aa2ab' },
  tabLabelActive: { color: BLUE, fontWeight: '600' },
  tabUnderline: { height: 2.5, backgroundColor: 'transparent', width: '100%', marginTop: 8, borderRadius: 2 },
  tabUnderlineActive: { backgroundColor: BLUE },

  tabContent: { paddingTop: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#2b3138', marginBottom: 16 },
  doneBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e7f7ef', borderRadius: 8, padding: 10, marginBottom: 14 },
  doneBannerText: { color: '#1a8f5f', fontSize: 13, fontWeight: '600', flex: 1 },
  completedHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  completedTitle: { fontSize: 18, fontWeight: '700', color: '#1a8f5f' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  gridItem: { marginRight: 10, marginBottom: 10 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  lightBtn: { backgroundColor: LIGHT_BLUE_BG, borderRadius: 6, paddingHorizontal: 14, height: 38, alignItems: 'center', justifyContent: 'center' },
  lightBtnText: { color: BLUE, fontSize: 13, fontWeight: '500' },
  uploadBtn: { flexDirection: 'row', gap: 8, backgroundColor: BLUE, borderRadius: 6, paddingHorizontal: 16, height: 42, alignItems: 'center', justifyContent: 'center' },
  uploadBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff5e6', borderRadius: 8, padding: 10, marginBottom: 14 },
  offlineText: { color: '#b06a00', fontSize: 12.5, flex: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fdecea', borderRadius: 8, padding: 10, marginBottom: 14 },
  errorText: { color: '#c0341d', fontSize: 12.5, flex: 1 },

  thumbStrip: { marginBottom: 18 },
  thumbWrap: { marginRight: 10 },
  mediaThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#eef1f4' },
  stamp: { marginTop: 5, width: 64 },
  stampRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginTop: 1 },
  stampText: { flex: 1, fontSize: 9.5, lineHeight: 12, color: '#5b6b7b' },
  videoPlaceholder: { backgroundColor: '#1f2733', alignItems: 'center', justifyContent: 'center' },
  videoClip: { overflow: 'hidden' },
  videoFill: { width: '100%', height: '100%', backgroundColor: '#1f2733' },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', alignItems: 'center', justifyContent: 'center' },
  viewerMedia: { width: '100%', height: '82%' },
  viewerClose: { position: 'absolute', top: 44, right: 18, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  playOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadge: { position: 'absolute', bottom: 4, right: 4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 3, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },

  docList: { marginBottom: 18, gap: 8 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  docName: { flex: 1, fontSize: 13.5, color: DARK },
  docThumb: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#eef1f4', overflow: 'hidden' },
  pdfHiddenWeb: { position: 'absolute', width: 1, height: 1, opacity: 0, backgroundColor: 'transparent' },

  label: { fontSize: 14, color: '#7b8794', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d7dbe0', borderRadius: 8, height: 48, paddingHorizontal: 14, fontSize: 15, color: '#2b3138', marginBottom: 20 },
  textarea: { borderWidth: 1, borderColor: '#e2e5e9', backgroundColor: '#fafbfc', borderRadius: 8, minHeight: 90, padding: 14, fontSize: 15, color: '#2b3138' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  loadingText: { color: MUTED, fontSize: 13 },

  // Packing
  packingWrap: { marginTop: 22 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: DARK, marginBottom: 10 },
  cargoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  cargoPill: { paddingHorizontal: 18, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#d7dbe0', alignItems: 'center', justifyContent: 'center' },
  cargoPillActive: { backgroundColor: BLUE, borderColor: BLUE },
  cargoPillText: { color: '#5c636b', fontSize: 14 },
  cargoPillTextActive: { color: '#ffffff', fontWeight: '600' },
  boxCard: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 14 },
  boxTitle: { fontSize: 14, fontWeight: '600', color: DARK, marginBottom: 12 },
  boxGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  boxField: { width: '47%' },
  boxFieldLabel: { fontSize: 12.5, color: '#7b8794', marginBottom: 6 },
  boxInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d7dbe0', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  boxInput: { flex: 1, fontSize: 15, color: '#2b3138' },
  boxSuffix: { color: '#9aa2ab', fontSize: 13 },

  nextBtn: { alignSelf: 'flex-end', marginTop: 20, backgroundColor: BLUE, borderRadius: 8, height: 40, paddingHorizontal: 20, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
