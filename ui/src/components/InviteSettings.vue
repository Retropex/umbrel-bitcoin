<template>
  <div
    class="py-3 px-2 d-flex align-items-center w-100 flex flex-column text-center"
  >
    <h3>Be sovereign</h3>
    <p class="h1 mb-4 mt-3">
      <img
        style="height: 7rem; width: 7rem; border-radius: 22%;"
        src="@/assets/icon.svg"
        alt="Bitcoin Knots icon"
      />
    </p>
    <p class="mb-4 w-75">
      You should check the settings to see if they match what you expect from your node.
    </p>
    <button @click="$emit('close')" class="btn btn-primary">Close</button>
  </div>
</template>