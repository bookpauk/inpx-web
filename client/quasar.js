import 'quasar/dist/quasar.css';

import Quasar from 'quasar/src/vue-plugin.js';
//config
const config = {};

//components
//import {QLayout} from 'quasar/src/components/layout';
//import {QPageContainer, QPage} from 'quasar/src/components/page';
//import {QDrawer} from 'quasar/src/components/drawer';

//import {QCircularProgress} from 'quasar/src/components/circular-progress';
import {QInput} from 'quasar/src/components/input';
import {QBtn} from 'quasar/src/components/btn';
//import {QBtnGroup} from 'quasar/src/components/btn-group';
//import {QBtnToggle} from 'quasar/src/components/btn-toggle';
import {QIcon} from 'quasar/src/components/icon';
//import {QSlider} from 'quasar/src/components/slider';
//import {QTabs, QTab} from 'quasar/src/components/tabs';
//import {QTabPanels, QTabPanel} from 'quasar/src/components/tab-panels';
//import {QSeparator} from 'quasar/src/components/separator';
//import {QList} from 'quasar/src/components/item';
//import {QItem, QItemSection, QItemLabel} from 'quasar/src/components/item';
//import {QTooltip} from 'quasar/src/components/tooltip';
import {QSpinner} from 'quasar/src/components/spinner';
//import {QTable, QTh, QTr, QTd} from 'quasar/src/components/table';
//import {QCheckbox} from 'quasar/src/components/checkbox';
import {QSelect} from 'quasar/src/components/select';
//import {QColor} from 'quasar/src/components/color';
//import {QPopupProxy} from 'quasar/src/components/popup-proxy';
import {QDialog} from 'quasar/src/components/dialog';
//import {QChip} from 'quasar/src/components/chip';
//import {QTree} from 'quasar/src/components/tree';
//import {QVirtualScroll} from 'quasar/src/components/virtual-scroll';

//import {QExpansionItem} from 'quasar/src/components/expansion-item';

const components = {
    //QLayout,
    //QPageContainer, QPage,
    //QDrawer,

    //QCircularProgress,
    QInput,
    QBtn,
    //QBtnGroup,
    //QBtnToggle,
    QIcon,
    //QSlider,
    //QTabs, QTab,
    //QTabPanels, QTabPanel,
    //QSeparator,
    //QList,
    //QItem, QItemSection, QItemLabel,
    //QTooltip,
    QSpinner,
    //QTable, QTh, QTr, QTd,
    //QCheckbox,
    QSelect,
    //QColor,
    //QPopupProxy,
    QDialog,
    //QChip,
    //QTree,
    //QExpansionItem,
    //QVirtualScroll,
};

//directives 
//import Ripple from 'quasar/src/directives/Ripple';
import ClosePopup from 'quasar/src/directives/ClosePopup';

const directives = {/*Ripple, */ClosePopup};

//plugins
//import AppFullscreen from 'quasar/src/plugins/AppFullscreen';
//import Notify from 'quasar/src/plugins/Notify';

const plugins = {
    //AppFullscreen,
    //Notify,
};

//icons
//import '@quasar/extras/fontawesome-v5/fontawesome-v5.css';
//import fontawesomeV5 from 'quasar/icon-set/fontawesome-v5.js'

import '@quasar/extras/line-awesome/line-awesome.css';
import lineAwesome from 'quasar/icon-set/line-awesome.js'

export default {
    quasar: Quasar,
    options: { config, components, directives, plugins }, 
    init: () => {
        Quasar.iconSet.set(lineAwesome);
}
};