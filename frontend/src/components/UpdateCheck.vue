<template>
</template>

<script type="text/javascript">
export default {
  data() {
    return {
      manual: false,
      updateChecking: false,
      downloadProcessShow: false,
    };
  },
  created() {
    this.$bus.$on('update-check', (manual = false) => {
      this.manual = manual;
      if (this.updateChecking) return;
      this.updateChecking = true;
      this.$notify.closeAll();
      setTimeout(() => {
        this.resetDownloadProcess();
        this.manual && this.$notify.success({
          title: this.$t('message.update_not_available'),
          duration: 2000,
        });
      }, 1000);
    });
  },
  methods: {
    resetDownloadProcess() {
      this.updateChecking = false;
      this.downloadProcessShow = false;
    },
  },
};
</script>
