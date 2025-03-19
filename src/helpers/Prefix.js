import { ApiState } from "../states/ApiState";
import { changeURL } from "./URL";

/**
 * Function to load prefix options into the dropdown menu.
 */
export function loadPrefixOptions() {
    const prefixOptions = ApiState.value.prefixOptions;

    const prefixDropdown = document.querySelector('#prefix-dropdown-container .dropdown-menu');

    for (let i = 0; i < prefixOptions.length; i++) {
        const prefixItem = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'dropdown-item';
        link.textContent = prefixOptions[i];
        link.style.whiteSpace = 'normal';
        link.style.wordWrap = 'break-word';
        link.style.overflowWrap = 'break-word';
        
        prefixItem.appendChild(link);
        prefixDropdown.appendChild(prefixItem);
    }
}

export function selectPrefix() {
    const dropdownMenuButton = document.getElementById("dropdownMenuButton");
    const prefixItems = document.getElementsByClassName("dropdown-item");

    for (let i = 0; i < prefixItems.length; i++) {
        
        prefixItems.item(i).addEventListener("click", () => {

            const params = new URLSearchParams(""); // clears out the params

            params.append('prefix', prefixItems.item(i).innerText);
            changeURL(params);

            if (prefixItems.item(i).innerText !== ApiState.value.prefix) {
                dropdownMenuButton.innerHTML = ApiState.value.prefix;
                window.location.reload();
            }
        })
    }
}