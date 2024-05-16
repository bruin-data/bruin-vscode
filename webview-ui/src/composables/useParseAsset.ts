import { parseAssetDetails, updateValue } from "@/utilities/helper";
import { ref, onMounted, onBeforeUnmount, computed } from "vue";


export function useParseAsset() {
    const parseSuccess = ref(null as any);
    const parseError = ref(null as any);

    function receiveMessageAsset(event) {
        if (!event) return;
        const envelope = event.data;
        switch (envelope.command) {
            case "parse-message":
                //console.log("Received message from parse command", envelope);
                parseSuccess.value = updateValue(envelope, "success");
                //console.log("parseSuccess", parseSuccess.value);
                parseError.value = updateValue(envelope, "error");
                //console.log("parseSuccess after Error", parseSuccess.value);
                break;
        }
    }

    onBeforeUnmount(() => {
        window.removeEventListener("message", receiveMessageAsset);
    });
    onMounted(() => {
        window.addEventListener("message", receiveMessageAsset);
    }
    );

    return {
        parseSuccess,
        parseError,
    };
}

