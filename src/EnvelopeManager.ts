import fs from "fs";
import crypto from "crypto";
import envelopeConfig from "../envelope-config.json" assert { type: "json" };

class EnvelopeManager {
  private clearTextFile: string;
  private privateKeyFile: string;
  private publicKeyFile: string;
  private encryptedFile: string;
  private encryptedKey: string;
  private symmetricAlgorithm: string;

  constructor() {
    this.clearTextFile = envelopeConfig.clearText;
    this.privateKeyFile = envelopeConfig.rsaPrivateKey;
    this.publicKeyFile = envelopeConfig.rsaPublicKey;
    this.encryptedFile = envelopeConfig.envelopeMessage;
    this.encryptedKey = envelopeConfig.envelopeKey;

    switch (envelopeConfig.simetricAlgorithm) {
      case "AES":
        this.symmetricAlgorithm = "AES-256-ECB";
      case "DES":
        this.symmetricAlgorithm = "DES-ECB";
      case "RC4":
        this.symmetricAlgorithm = "RC4";
      default:
        this.symmetricAlgorithm = "AES-256-ECB";
    }
  }

  public createEnvelope(): void {
    const symmetricKey = <Buffer>this.generateSymmetricKey();

    const encryptedFile = this.encryptFile(
      this.clearTextFile,
      symmetricKey,
      this.symmetricAlgorithm
    );

    const encryptedKey = this.encryptSymmetricKey(
      symmetricKey,
      this.publicKeyFile
    );

    fs.writeFileSync(
      `./encrypted-messages/${this.encryptedFile}`,
      encryptedFile
    );
    fs.writeFileSync(`./encrypted-messages/${this.encryptedKey}`, encryptedKey);

    console.log("Envelope criado com sucesso!");
  }

  public openEnvelope(): void {
    const symmetricKey = this.decryptSymmetricKey(
      this.encryptedKey,
      this.privateKeyFile
    );
    const decryptedFile = this.decryptFile(
      this.encryptedFile,
      symmetricKey,
      this.symmetricAlgorithm
    );

    fs.writeFileSync("./decrypted-messages/decrypted_file.txt", decryptedFile);

    console.log("Envelope aberto com sucesso!");
  }

  private generateSymmetricKey(): Buffer {
    return crypto.randomBytes(32); // Gera uma chave simétrica de 32 bytes (256 bits)
  }

  private encryptFile(
    plainFile: string,
    symmetricKey: Buffer,
    symmetricAlgorithm: string
  ): string {
    // Inicializa algoritmo de cifragem com chave e vetor de inicialização vazio.
    const cipher = crypto.createCipheriv(symmetricAlgorithm, symmetricKey, "");
    // Lê texto em claro.
    const plainData = fs.readFileSync(`./clear-texts/${plainFile}`).toString();
    // Cifra o texto em claro.
    let encryptedData = cipher.update(plainData);
    encryptedData = Buffer.concat([encryptedData, cipher.final()]);
    console.log("encryptedData Buffer", encryptedData);
    console.log("encryptedData String", encryptedData.toString("hex"));
    // Retorna o texto em formato hexadecimal.
    return encryptedData.toString("hex");
  }

  private decryptFile(
    encryptedFile: string,
    symmetricKey: Buffer,
    symmetricAlgorithm: string
  ): string {
    // Inicializa algoritmo de decifragem utilizando a chave descifrada e o vetor de inicialização vazio.
    const decipher = crypto.createDecipheriv(
      symmetricAlgorithm,
      symmetricKey,
      ""
    );
    console.log("##### decryptFile ####");
    console.log("symmetricKey", symmetricKey);

    // lê envelope criptografado no arquivo especificado.
    const encryptedData = fs.readFileSync(
      `./encrypted-messages/${encryptedFile}`,
      "utf-8"
    );
    console.log("encryptedData", encryptedData);
    // Decifra mensagem do envelope
    let decryptedData = decipher.update(encryptedData, "hex", "utf-8");
    console.log("decryptedData", decryptedData);
    decryptedData += decipher.final("utf8");

    console.log("decryptedData 2", decryptedData);
    // Retorna mensagem decifrada.
    return decryptedData;
  }

  private encryptSymmetricKey(
    symmetricKey: Buffer,
    publicKeyFile: string
  ): string {
    // Lê a chave pública do destinatário no arquivo especificado.
    const publicKey = fs.readFileSync(`./rsa-keys/${publicKeyFile}`, "utf8");
    console.log("Symmetric Key Buffer", symmetricKey);

    // Cifra a chave simétrica com a chave pública.
    const encryptedKey = crypto.publicEncrypt(publicKey, symmetricKey);
    console.log("Encrypted Symmetric Key Buffer", encryptedKey);

    // Retorna a chave simétrica critografada em base64.
    return encryptedKey.toString("base64");
  }

  private decryptSymmetricKey(
    encryptedKey: string,
    privateKeyFile: string
  ): Buffer {
    // lê a chave privada do destinatário no arquivo especificado.
    const privateKey = fs.readFileSync(`./rsa-keys/${privateKeyFile}`, "utf8");

    const encryptedKeyFile = fs.readFileSync(
      `./encrypted-messages/${encryptedKey}`,
      "utf8"
    );

    // Cria um buffer com a chave cifrada em base64.
    const encryptedKeyBuffer = Buffer.from(encryptedKeyFile, "base64");
    console.log("Encrypted Symmetric Key Buffer", encryptedKeyBuffer);

    // Decifra a chave simétrica utilizando a chave privada do destinatário.
    const decryptedKey = crypto.privateDecrypt(privateKey, encryptedKeyBuffer);
    console.log("Dencrypted Symmetric Key Buffer", decryptedKey);
    // Retorna a chave simétrica
    return decryptedKey;
  }
}

export default EnvelopeManager;
