import fs from "fs";
import crypto from "crypto";
import envelopeConfig from "../envelope-config.json" assert { type: "json" };

/**
 * Gerencia o envelope digital.
 */
class EnvelopeManager {
  /**
   * Caminho do arquivo de texto sem criptografia.
   */
  private clearTextFile: string;
  /**
   * Caminho do arquivo de chave privada RSA.
   */
  private privateKeyFile: string;
  /**
   * Caminho do arquivo de chave pública RSA.
   */
  private publicKeyFile: string;
  /**
   * Caminho do arquivo de mensagem criptografada.
   */
  private encryptedFile: string;
  /**
   * Caminho do arquivo de chave do envelope.
   */
  private encryptedKey: string;
  /**
   * Algoritmo simétrico utilizado.
   */
  private symmetricAlgorithm: string;
  /**
   * Chave simétrica utilizada.
   */
  private symmetricKey: Buffer;

  constructor() {
    this.clearTextFile = envelopeConfig.clearText;
    this.privateKeyFile = envelopeConfig.rsaPrivateKey;
    this.publicKeyFile = envelopeConfig.rsaPublicKey;
    this.encryptedFile = envelopeConfig.envelopeMessage;
    this.encryptedKey = envelopeConfig.envelopeKey;

    switch (envelopeConfig.simetricAlgorithm) {
      case "AES":
        this.symmetricAlgorithm = "AES-256-ECB";
        this.symmetricKey = this.generateSymmetricKey(32);
        break;
      case "DES":
        this.symmetricAlgorithm = "DES-ECB";
        this.symmetricKey = this.generateSymmetricKey(8);
        break;
      case "RC4":
        this.symmetricAlgorithm = "RC4";
        this.symmetricKey = this.generateSymmetricKey(64);
        break;
      default:
        this.symmetricAlgorithm = "AES-256-ECB";
        this.symmetricKey = this.generateSymmetricKey(32);
        break;
    }
  }

  /**
   * Cria um envelope digital.
   */
  public createEnvelope(): void {
    if (!this.validateRSAKey()) return;
    this.printCreateHeader();

    const encryptedFile = this.encryptFile(
      this.clearTextFile,
      this.symmetricKey,
      this.symmetricAlgorithm
    );

    const encryptedKey = this.encryptSymmetricKey(
      this.symmetricKey,
      this.publicKeyFile
    );

    fs.writeFileSync(
      `./encrypted-messages/${this.encryptedFile}`,
      encryptedFile
    );
    fs.writeFileSync(`./encrypted-messages/${this.encryptedKey}`, encryptedKey);

    this.printCreateSuccess();
  }

  /**
   * Abre um envelope digital.
   */
  public openEnvelope(): void {
    if (!this.validateRSAKey()) return;
    this.printOpenHeader();

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

    this.printOpenSuccess();
  }

  /**
   * Valida a chave RSA.
   * @returns Retorna true se a chave for válida, senão retorna false.
   */
  public validateRSAKey(): boolean {
    const publicKey = fs.readFileSync(
      `./rsa-keys/${this.publicKeyFile}`,
      "utf8"
    );
    const privateKey = fs.readFileSync(
      `./rsa-keys/${this.privateKeyFile}`,
      "utf8"
    );

    try {
      const data = "Teste de validação de chave";

      const sign = crypto.sign("sha256", Buffer.from(data), privateKey);

      const isValid = crypto.verify(
        "sha256",
        Buffer.from(data),
        publicKey,
        sign
      );

      if (isValid) {
        return true;
      }
    } catch (error) {
      this.printFailledRSAKeys();
      return false;
    }
    return false;
  }

  /**
   * Gera uma chave simétrica.
   * @param keySize Tamanho da chave em bytes.
   * @returns A chave simétrica gerada.
   */
  private generateSymmetricKey(keySize: number): Buffer {
    // Gera uma chave simétrica de 32 bytes (256 bits)
    return crypto.randomBytes(keySize);
  }

  /**
   * Criptografa um arquivo.
   * @param plainFile Caminho do arquivo de texto sem criptografia.
   * @param symmetricKey Chave simétrica utilizada para a criptografia.
   * @param symmetricAlgorithm Algoritmo simétrico utilizado para a criptografia.
   * @returns O arquivo criptografado em formato hexadecimal.
   */
  private encryptFile(
    plainFile: string,
    symmetricKey: Buffer,
    symmetricAlgorithm: string
  ): string {
    // Inicializa algoritmo de cifragem com chave e vetor de inicialização vazio.
    const cipher = crypto.createCipheriv(symmetricAlgorithm, symmetricKey, "");
    // Lê texto em claro.
    const plainData = fs.readFileSync(`./clear-texts/${plainFile}`).toString();
    console.log("Mensagem em Claro: ");
    console.log(plainData);

    // Cifra o texto em claro.
    let encryptedData = cipher.update(plainData);
    encryptedData = Buffer.concat([encryptedData, cipher.final()]);

    console.log("Mensagem Cifrada: ");
    console.log(encryptedData);

    // Retorna o texto em formato hexadecimal.
    return encryptedData.toString("hex");
  }

  /**
   * Criptografa a chave simétrica.
   * @param symmetricKey Chave simétrica a ser criptografada.
   * @param publicKeyFile Caminho do arquivo de chave pública RSA.
   * @returns A chave simétrica criptografada em base64.
   */
  private encryptSymmetricKey(
    symmetricKey: Buffer,
    publicKeyFile: string
  ): string {
    console.log("Chave Simétrica Gerada:");
    console.log(symmetricKey);

    // Lê a chave pública do destinatário no arquivo especificado.
    const publicKey = fs.readFileSync(`./rsa-keys/${publicKeyFile}`, "utf8");

    // Cifra a chave simétrica com a chave pública.
    const encryptedKey = crypto.publicEncrypt(publicKey, symmetricKey);

    console.log("Chave Simétrica Cifrada:");
    console.log(encryptedKey);

    // Retorna a chave simétrica critografada em base64.
    return encryptedKey.toString("base64");
  }

  /**
   * Decifra a chave simétrica.
   * @param encryptedKey Chave simétrica criptografada em base64.
   * @param privateKeyFile Caminho do arquivo de chave privada RSA.
   * @returns A chave simétrica decifrada.
   */
  private decryptSymmetricKey(
    encryptedKey: string,
    privateKeyFile: string
  ): Buffer {
    // lê a chave privada do destinatário no arquivo especificado.
    const privateKey = fs.readFileSync(`./rsa-keys/${privateKeyFile}`, "utf8");

    // lê a chave simétrica cifrada no arquivo especificado.
    const encryptedKeyFile = fs.readFileSync(
      `./encrypted-messages/${encryptedKey}`,
      "utf8"
    );

    // Cria um buffer com a chave cifrada em base64.
    const encryptedKeyBuffer = Buffer.from(encryptedKeyFile, "base64");
    console.log("Chave Simétrica Cifrada:");
    console.log(encryptedKeyBuffer);

    // Decifra a chave simétrica utilizando a chave privada do destinatário.
    const decryptedKey = crypto.privateDecrypt(privateKey, encryptedKeyBuffer);
    console.log("Chave Simétrica Decifrada:");
    console.log(decryptedKey);

    // Retorna a chave simétrica
    return decryptedKey;
  }

  /**
   * Decifra um arquivo.
   * @param encryptedFile Caminho do arquivo criptografado.
   * @param symmetricKey Chave simétrica utilizada para a decifragem.
   * @param symmetricAlgorithm Algoritmo simétrico utilizado para a decifragem.
   * @returns O arquivo decifrado.
   */
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

    // lê envelope criptografado no arquivo especificado.
    const encryptedData = fs.readFileSync(
      `./encrypted-messages/${encryptedFile}`,
      "utf-8"
    );
    console.log("Mensagem Cifrada:");
    console.log(Buffer.from(encryptedData, "hex"));

    // Decifra mensagem do envelope
    let decryptedData = decipher.update(encryptedData, "hex", "utf-8");
    decryptedData += decipher.final("utf8");

    console.log("Mensagem Decifrada:");
    console.log(decryptedData);
    // Retorna mensagem decifrada.
    return decryptedData;
  }

  /**
   * Imprime cabeçalho para a criação do envelope.
   */
  private printCreateHeader() {
    console.log(
      "================================================================"
    );
    console.log(
      `================ Criando um Envelope Digital ===================`
    );
    console.log(
      `----------- By: Pumba Developer (www.pumbadev.com) -------------`
    );
    console.log(
      "================================================================"
    );
    console.log("Algoritmo Simétrico: ", this.symmetricAlgorithm);
    console.log("Chave RSA Pública: ", this.publicKeyFile);
    console.log("Chave RSA Privada: ", this.privateKeyFile);
    console.log("Envelope: ", this.encryptedKey);
    console.log("Chave do Envelope: ", this.encryptedFile);
    console.log(
      "================================================================"
    );
  }

  /**
   * Imprime mensagem de sucesso ao criar o envelope.
   */
  private printCreateSuccess() {
    console.log(
      "================================================================"
    );
    console.log("Envelope criado com sucesso!");
    console.log(
      "================================================================"
    );
  }

  /**
   * Imprime cabeçalho para a abertura do envelope.
   */
  private printOpenHeader() {
    console.log(
      "================================================================"
    );
    console.log(
      `================ Abrindo um Envelope Digital ===================`
    );
    console.log(
      `----------- By: Pumba Developer (www.pumbadev.com) -------------`
    );
    console.log(
      "================================================================"
    );
    console.log("Algoritmo Simétrico: ", this.symmetricAlgorithm);
    console.log("Chave RSA Pública: ", this.publicKeyFile);
    console.log("Chave RSA Privada: ", this.privateKeyFile);
    console.log("Envelope: ", this.encryptedKey);
    console.log("Chave do Envelope: ", this.encryptedFile);
    console.log(
      "================================================================"
    );
  }

  /**
   * Imprime mensagem de sucesso ao abrir o envelope.
   */
  private printOpenSuccess() {
    console.log(
      "================================================================"
    );
    console.log("Envelope aberto com sucesso!");
    console.log(
      "================================================================"
    );
  }

  /**
   * Imprime mensagem de falha ao validar a chave RSA.
   */
  private printFailledRSAKeys() {
    console.log(
      "================================================================"
    );
    console.log(
      `============= O par de chaves RSA é INVÁLIDO!! =================`
    );
    console.log(
      `----------- By: Pumba Developer (www.pumbadev.com) -------------`
    );
    console.log(
      "================================================================"
    );
    console.log("Chave RSA Pública: ", this.publicKeyFile);
    console.log("Chave RSA Privada: ", this.privateKeyFile);
    console.log(
      "================================================================"
    );
  }
}

export default EnvelopeManager;
