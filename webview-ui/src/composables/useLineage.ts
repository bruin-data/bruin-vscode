import { updateValue } from '@/utilities/helper';
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

export function useLineage() {
    const lineageSuccess = ref(null);
    const lineageError = ref(null);

    function receiveMessage(event) {
        if (!event) return;
        const envelope = event.data;
        switch (envelope.command) {
            case "lineage-message":
                lineageSuccess.value = updateValue(envelope, "success");
                lineageError.value = updateValue(envelope, "error");
                break;
        }
    }

    onMounted(() => {
        window.addEventListener("message", receiveMessage);
    });

    onBeforeUnmount(() => {
        window.removeEventListener("message", receiveMessage);
    });

    const formattedLineage = computed(() => {
        if (lineageSuccess.value) {
            try {
                console.log("Lineage data:", lineageSuccess.value);
                return JSON.parse(lineageSuccess.value);
            } catch (e) {
                console.error("Error parsing lineage data:", e);
                return e;
            }
        }
        return 'No lineage data available.';
    });

    return {
        formattedLineage,
        lineageError,
        lineageSuccess
    };
}
