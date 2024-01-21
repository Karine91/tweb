import PopupElement from '.';
import {render} from 'solid-js/web';
import I18n, {i18n} from '../../lib/langPack';
import Row from '../row';
import {toast} from '../toast';
import {copyTextToClipboard} from '../../helpers/clipboard';
import ButtonIcon from '../buttonIcon';
import {createEffect, createSignal} from 'solid-js';
import {attachClickEvent} from '../../helpers/dom/clickEvent';
import {replaceButtonIcon} from '../button';
import AppMediaLiveStreamViewer from '../appMediaLiveStreamViwer';
import {AppManagers} from '../../lib/appManagers/managers';

export default class PopupLiveStreamWith extends PopupElement {
  private streamKeyShowBtn: HTMLElement;
  private streamKeyInput: HTMLInputElement;


  constructor(private peerId: number, private streamKeyValue: string, private serverURL: string, public managers: AppManagers) {
    super('popup-stream-with', {
      closable: true,
      overlayClosable: true,
      body: true,
      title: 'Chat.StreamWith.Title',
      footer: true,
      withConfirm: true
    });

    this.construct();
  }

  private _construct() {
    const [showKey, setShowKey] = createSignal(false);

    const linkRow = new Row({
      title: this.serverURL,
      icon: 'link',
      subtitleLangKey: 'Chat.StreamWith.Link.Subtitle',
      clickable: () => {
        copyTextToClipboard(this.serverURL);
        toast(I18n.format('Chat.StreamWith.ServerURL.Copied', true));
      },
      buttonRight: ButtonIcon('copy'),
      iconClasses: ['left-icon']
    });

    this.streamKeyInput = document.createElement('input');
    this.streamKeyInput.type = 'password';
    this.streamKeyInput.classList.add('stream-key-input');
    this.streamKeyInput.value = this.streamKeyValue;

    this.streamKeyShowBtn = ButtonIcon('eye1 show-stream-key-btn');
    this.btnConfirm.classList.add('popup-stream-with-button');
    this.btnConfirm.append(i18n('Chat.StreamWith.StartStreamingBtn'));
    this.footer.append(this.btnConfirm);

    attachClickEvent(this.streamKeyShowBtn, (e) => {
      e.stopPropagation();
      setShowKey(prevValue => !prevValue);
    });

    attachClickEvent(this.btnConfirm, () => {
      new AppMediaLiveStreamViewer(this.managers, this.peerId).openMedia(this.serverURL, this.streamKeyValue );
      this.hide();
    })

    const streamKeyRow = new Row({
      title: this.streamKeyInput,
      icon: 'lock',
      subtitle: i18n('Chat.StreamWith.StreamKey'),
      subtitleRight: this.streamKeyShowBtn,
      buttonRight: ButtonIcon('copy'),
      iconClasses: ['left-icon'],
      clickable: () => {
        copyTextToClipboard(this.streamKeyValue);
        toast(I18n.format('Chat.StreamWith.StreamKey.Copied', true));
      }
    });


    streamKeyRow.container.classList.add('stream-key-row');

    createEffect(() => {
      if(showKey()) {
        replaceButtonIcon(this.streamKeyShowBtn, 'eyecross_outline');
        this.streamKeyInput.type = 'text';
      } else {
        replaceButtonIcon(this.streamKeyShowBtn, 'eye1');
        this.streamKeyInput.type = 'password';
      }
    }, showKey())

    return (
      <>
        <p>{i18n('Chat.StreamWith.Description')}</p>
        {linkRow.container}
        {streamKeyRow.container}
        <p>{i18n('Chat.StreamWith.ClickButtonText')}</p>
      </>
    );
  }

  private construct() {
    const div = document.createElement('div');
    this.body.prepend(div);
    const dispose = render(() => this._construct(), div);
    this.addEventListener('closeAfterTimeout', dispose);

    this.show();
  }
}
