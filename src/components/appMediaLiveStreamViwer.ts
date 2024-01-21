// import flvjs from 'flv.js';
// import  videojs from 'video.js';
import {MiddlewareHelper, getMiddleware} from '../helpers/middleware';
import {avatarNew} from './avatarNew';
import ButtonIcon from './buttonIcon';
import overlayCounter from '../helpers/overlayCounter';
import animationIntersector from './animationIntersector';
import {MEDIA_VIEWER_CLASSNAME} from './appMediaViewerBase';
import wrapPeerTitle from './wrappers/peerTitle';
import {NULL_PEER_ID} from '../lib/mtproto/mtproto_config';
import replaceContent from '../helpers/dom/replaceContent';
import createVideo from '../helpers/dom/createVideo';
import cancelEvent from '../helpers/dom/cancelEvent';
import {attachClickEvent} from '../helpers/dom/clickEvent';
import {AppManagers} from '../lib/appManagers/managers';


export default class AppMediaLiveStreamViewer {
  private wholeDiv: HTMLElement;
  private overlaysDiv: HTMLElement;
  private topbar: HTMLElement;
  private content: {[k in 'main' | 'container' | 'media'  ]: HTMLElement} = {} as any;
  private author: {
        avatarEl: ReturnType<typeof avatarNew>,
        avatarMiddlewareHelper?: MiddlewareHelper,
        container: HTMLElement,
        nameEl: HTMLElement,
        date: HTMLElement
      } = {} as any;
  private buttons: {[k in 'close' | 'mobile-close' | 'forward']: HTMLElement} = {} as any;
  private pageEl = document.getElementById('page-chats') as HTMLDivElement;
  protected middlewareHelper: MiddlewareHelper;

  async init() {
    const call = await this.managers.appGroupCallsManager.createLiveStreamGroupCall(this.peerId);
    console.log('callId', call.id);

    const data2 = await this.managers.appGroupCallsManager.getStreamChannels(call.id);
    console.log(data2);
  }

  constructor(public managers: AppManagers, public peerId: number) {
    this.init();
    this.middlewareHelper = getMiddleware();
    this.wholeDiv = document.createElement('div');
    this.wholeDiv.classList.add(MEDIA_VIEWER_CLASSNAME + '-whole');

    this.overlaysDiv = document.createElement('div');
    this.overlaysDiv.classList.add('overlays');

    const mainDiv = document.createElement('div');
    mainDiv.classList.add(MEDIA_VIEWER_CLASSNAME);

    const topbar = this.topbar = document.createElement('div');
    topbar.classList.add(MEDIA_VIEWER_CLASSNAME + '-topbar', MEDIA_VIEWER_CLASSNAME + '-appear');

    const topbarLeft = document.createElement('div');
    topbarLeft.classList.add(MEDIA_VIEWER_CLASSNAME + '-topbar-left');

    this.buttons['mobile-close'] = ButtonIcon('close', {onlyMobile: true});

    // * author
    this.author.container = document.createElement('div');
    this.author.container.classList.add(MEDIA_VIEWER_CLASSNAME + '-author', 'no-select');
    const authorRight = document.createElement('div');

    this.author.nameEl = document.createElement('div');
    this.author.nameEl.classList.add(MEDIA_VIEWER_CLASSNAME + '-name');

    this.author.date = document.createElement('div');
    this.author.date.classList.add(MEDIA_VIEWER_CLASSNAME + '-date');

    authorRight.append(this.author.nameEl, this.author.date);

    this.author.container.append(authorRight);

    // * buttons
    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList.add(MEDIA_VIEWER_CLASSNAME + '-buttons');

    (['forward', 'close'] as const).forEach((name) => {
      const button = ButtonIcon(name as Icon, {noRipple: true});
      this.buttons[name] = button;
      buttonsDiv.append(button);
    });

    // * content
    this.content.main = document.createElement('div');
    this.content.main.classList.add(MEDIA_VIEWER_CLASSNAME + '-content');

    this.content.container = document.createElement('div');
    this.content.container.classList.add(MEDIA_VIEWER_CLASSNAME + '-container');

    this.content.media = document.createElement('div');
    this.content.media.classList.add(MEDIA_VIEWER_CLASSNAME + '-media');

    this.content.container.append(this.content.media);

    this.content.main.append(this.content.container);
    mainDiv.append(this.content.main);
    this.overlaysDiv.append(mainDiv);

    topbarLeft.append(this.buttons['mobile-close'], this.author.container);
    topbar.append(topbarLeft, buttonsDiv);

    this.wholeDiv.append(this.overlaysDiv,  this.topbar);


    this.setListeners();
  }

  protected toggleOverlay(active: boolean) {
    overlayCounter.isDarkOverlayActive = active;
    animationIntersector.checkAnimations2(active);
  }

  protected toggleWholeActive(active: boolean) {
    if(active) {
      this.wholeDiv.classList.add('active');
    } else {
      this.wholeDiv.classList.add('backwards');
      setTimeout(() => {
        this.wholeDiv.classList.remove('active');
      }, 0);
    }
  }

  protected setAuthorInfo(fromId: PeerId | string) {
    const isPeerId = fromId.isPeerId();
    let wrapTitlePromise: Promise<HTMLElement> | HTMLElement;
    if(isPeerId) {
      wrapTitlePromise = wrapPeerTitle({
        peerId: fromId as PeerId,
        dialog: false,
        onlyFirstName: false,
        plainText: false
      })
    }

    const oldAvatar = this.author.avatarEl;
    const oldAvatarMiddlewareHelper = this.author.avatarMiddlewareHelper;
    const newAvatar = this.author.avatarEl = avatarNew({
      middleware: (this.author.avatarMiddlewareHelper = this.middlewareHelper.get().create()).get(),
      size: 44,
      peerId: fromId as PeerId || NULL_PEER_ID,
      peerTitle: isPeerId ? undefined : '' + fromId
    });

    newAvatar.node.classList.add(MEDIA_VIEWER_CLASSNAME + '-userpic');

    return Promise.all([
      newAvatar.readyThumbPromise,
      wrapTitlePromise
    ]).then(([_, title]) => {
      replaceContent(this.author.date, 'streaming');
      replaceContent(this.author.nameEl, title);

      if(oldAvatar?.node && oldAvatar.node.parentElement) {
        oldAvatar.node.replaceWith(this.author.avatarEl.node);
      } else {
        this.author.container.prepend(this.author.avatarEl.node);
      }

      if(oldAvatar) {
        oldAvatar.node.remove();
        oldAvatarMiddlewareHelper.destroy();
      }
    });
  }

  public close(e?: MouseEvent) {
    if(e) {
      cancelEvent(e);
    }

    this.author.avatarMiddlewareHelper?.destroy();

    if((window as any).appMediaViewer === this) {
      (window as any).appMediaViewer = undefined;
    }


    this.wholeDiv.remove();
    this.toggleOverlay(false);
    this.middlewareHelper.destroy();
  }

  private setListeners() {
    [this.buttons.close, this.buttons['mobile-close']].forEach((el) => {
      attachClickEvent(el, this.close.bind(this));
    });
  }

  public async openMedia(streamURL: string, streamKey: string) {
    const container = this.content.media;
    const setAuthorPromise = this.setAuthorInfo(this.peerId);

    this.toggleOverlay(true);

    await setAuthorPromise;

    if(!this.wholeDiv.parentElement) {
      this.pageEl.insertBefore(this.wholeDiv, document.getElementById('main-columns'));
      void this.wholeDiv.offsetLeft; // reflow
    }

    const middleware = this.middlewareHelper.get();

    const video = createVideo({pip: true, middleware});
    this.content.media.append(video);


    // const player = MediaPlayer().create();
    // const url = 'https://cmafref.akamaized.net/cmaf/live-ull/2006350/akambr/out.mpd';
    // player.initialize(video, url, true);

    this.toggleWholeActive(true);

    // videojs(video, {
    //   autoplay: true,
    //   controls: true,
    //   sources: [{
    //     src: `${streamURL}${streamKey}.m3u8`,
    //     type: 'application/x-mpegURL'
    //   }],
    //   fluid: true
    // })


    // if(flvjs.isSupported()) {
    //   console.log({url: `${streamURL}${streamKey}`})
    //   const flvPlayer = flvjs.createPlayer({
    //     type: 'flv',
    //     url: `${streamURL}${streamKey}.m3u8`
    //     // isLive: true
    //   });
    //   flvPlayer.attachMediaElement(video);
    //   flvPlayer.load();
    //   flvPlayer.play();
    // }
  }
}
