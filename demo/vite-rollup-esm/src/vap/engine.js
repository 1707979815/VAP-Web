/**
 * @file engine.js
 * @description 播放器统一出口。本仓库是展示仓，`custom-vap` 取自 npm registry
 * （见 `package.json` 的 dependencies），不含库源码；调试库本体请在主包工程内进行。
 */
export {
  CustomVap,
  VapPlayState,
  VAPError,
  isVAPError,
  CustomIndexDB,
  initDB,
  dbInsert,
  dbUpdate,
  dbSelect,
  dbDelete,
  dbSelectAll,
  dbClear,
  cleanupExpiredData,
  trimByCapacity,
} from "custom-vap";

export { CustomVap as default } from "custom-vap";
