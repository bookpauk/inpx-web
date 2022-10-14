<template>
    <div class="hidden"></div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../vueComponent.js';

class Notify {
    notify(opts) {
        let {
            caption = null,
            captionColor = 'black',
            color = 'positive',
            icon = '',
            iconColor = 'white',
            message = '',
            messageColor = 'black',
            position = 'top-right',
        } = opts;

        caption = (caption ? `<div style="font-size: 120%; color: ${captionColor}"><b>${caption}</b></div><br>` : '');
        return this.$q.notify({
            position,
            color,
            textColor: iconColor,
            icon,
            actions: [{icon: 'la la-times notify-button-icon', color: 'black'}],
            html: true,

            message: 
                `<div style="max-width: 350px;">
                    ${caption}
                    <div style="color: ${messageColor}; overflow-wrap: break-word; word-wrap: break-word;">${message}</div>
                </div>`
        });
    }

    success(message, caption, options) {
        this.notify(Object.assign({color: 'positive', icon: 'la la-check-circle', message, caption}, options));
    }

    warning(message, caption, options) {
        this.notify(Object.assign({color: 'warning', icon: 'la la-exclamation-circle', message, caption}, options));
    }

    error(message, caption, options) {
        this.notify(Object.assign({color: 'negative', icon: 'la la-exclamation-circle', messageColor: 'yellow', captionColor: 'white', message, caption}, options));
    }

    info(message, caption, options) {
        this.notify(Object.assign({color: 'info', icon: 'la la-bell', message, caption}, options));
    }
}

export default vueComponent(Notify);
//-----------------------------------------------------------------------------
</script>
